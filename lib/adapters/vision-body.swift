// Body adapter (a): Apple Vision, macOS only, nothing to download. Our own code.
// usage: swift vision-body.swift <video> [poseStep=0.0667] [matteDir] [matteWidth=640] [matteRanges=all, e.g. 3.0-6.5,9-12]
//   VNDetectHumanBodyPoseRequest  -> body joints (nose, neck, shoulders, elbows, wrists, hips, ...)
//   VNDetectHumanHandPoseRequest  -> up to 2 hands, 21 points each, left/right
//   VNGeneratePersonSegmentationRequest -> person matte (hands and arms included)
//   VNGenerateForegroundInstanceMaskRequest (macOS 14+, matte frames only) -> microphone, mic arm, desk edge in front
// Prints one JSON line: {"width","height","fps","source":"macos-vision-body","step","grid":{w,h},"samples":[...],"matte":{...}}
//   sample = {"t", "joints":{"name":[x,y,conf]}, "hands":[{"side","conf","pts":{"name":[x,y,conf]}}],
//             "person":{"bbox":[x,y,w,h],"cover":0.31,"rows":["hex per grid row"]}}
// All points in video pixels, origin top-left. The grid is the matte reduced to grid.w x grid.h cells (1 = person).
// With matteDir, a grayscale PNG matte (soft edge, not grown) is written for EVERY video frame (m_000000.png ...), used only to draw
// graphics behind the person; the person's own pixels are never changed.
import AVFoundation
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: vision-body.swift <video> [poseStep] [matteDir] [matteWidth]"); exit(2) }
let url = URL(fileURLWithPath: args[1])
let poseStep = args.count >= 3 ? Double(args[2]) ?? 0.0667 : 0.0667
let matteDir: String? = args.count >= 4 && args[3] != "-" ? args[3] : nil
let matteW = args.count >= 5 ? Int(args[4]) ?? 640 : 640
// matte only where a graphic goes behind the person (seconds); "all" or nothing = every frame
let matteRanges: [(Double, Double)] = args.count >= 6 && args[5] != "all" ? args[5].split(separator: ",").compactMap { r in
  let p = r.split(separator: "-").compactMap { Double($0) }
  return p.count == 2 ? (p[0], p[1]) : nil
} : []
func wantMatte(_ t: Double) -> Bool { matteRanges.isEmpty || matteRanges.contains { t >= $0.0 && t <= $0.1 } }
let GW = 64, GH = 36

let asset = AVURLAsset(url: url)
guard let track = asset.tracks(withMediaType: AVMediaType.video).first else { print("{\"error\":\"no video track\"}"); exit(1) }
let fps = Double(track.nominalFrameRate > 0 ? track.nominalFrameRate : 30)
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.alwaysCopiesSampleData = false
reader.add(out)
reader.startReading()
if let d = matteDir { try? FileManager.default.createDirectory(atPath: d, withIntermediateDirectories: true) }

// transform (rotation) of the track, so points match the upright picture
let tf = track.preferredTransform
let natural = track.naturalSize.applying(tf)
let W = Int(abs(natural.width)), H = Int(abs(natural.height))
let orient: CGImagePropertyOrientation = {
  if tf.b == 1 && tf.c == -1 { return .right }
  if tf.b == -1 && tf.c == 1 { return .left }
  if tf.a == -1 && tf.d == -1 { return .down }
  return .up
}()

let jointNames: [(VNHumanBodyPoseObservation.JointName, String)] = [
  (.nose, "nose"), (.leftEye, "leftEye"), (.rightEye, "rightEye"), (.leftEar, "leftEar"), (.rightEar, "rightEar"),
  (.neck, "neck"), (.leftShoulder, "leftShoulder"), (.rightShoulder, "rightShoulder"),
  (.leftElbow, "leftElbow"), (.rightElbow, "rightElbow"), (.leftWrist, "leftWrist"), (.rightWrist, "rightWrist"),
  (.root, "root"), (.leftHip, "leftHip"), (.rightHip, "rightHip"),
]
let handNames: [(VNHumanHandPoseObservation.JointName, String)] = [
  (.wrist, "wrist"),
  (.thumbCMC, "thumbCMC"), (.thumbMP, "thumbMP"), (.thumbIP, "thumbIP"), (.thumbTip, "thumbTip"),
  (.indexMCP, "indexMCP"), (.indexPIP, "indexPIP"), (.indexDIP, "indexDIP"), (.indexTip, "indexTip"),
  (.middleMCP, "middleMCP"), (.middlePIP, "middlePIP"), (.middleDIP, "middleDIP"), (.middleTip, "middleTip"),
  (.ringMCP, "ringMCP"), (.ringPIP, "ringPIP"), (.ringDIP, "ringDIP"), (.ringTip, "ringTip"),
  (.littleMCP, "littleMCP"), (.littlePIP, "littlePIP"), (.littleDIP, "littleDIP"), (.littleTip, "littleTip"),
]
func px(_ p: CGPoint) -> (Double, Double) { (Double(p.x) * Double(W), (1 - Double(p.y)) * Double(H)) }
func f1(_ v: Double) -> String { String(format: "%.1f", v) }
func f3(_ v: Double) -> String { String(format: "%.3f", v) }

let ctx = CIContext(options: [.useSoftwareRenderer: false])
var samples: [String] = []
var frame = 0
var nextPose = 0.0
var matteCount = 0
var mH = 0

// dilate a binary-ish 8-bit mask by r px (max filter, separable)
func dilate(_ a: inout [UInt8], _ w: Int, _ h: Int, _ r: Int) {
  if r <= 0 { return }
  var tmp = a
  for y in 0..<h { for x in 0..<w { var m: UInt8 = 0; let x0 = max(0, x - r), x1 = min(w - 1, x + r); for k in x0...x1 { m = max(m, a[y * w + k]) }; tmp[y * w + x] = m } }
  for y in 0..<h { for x in 0..<w { var m: UInt8 = 0; let y0 = max(0, y - r), y1 = min(h - 1, y + r); for k in y0...y1 { m = max(m, tmp[k * w + x]) }; a[y * w + x] = m } }
}

while let sb = out.copyNextSampleBuffer() {
  guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
  let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
  let doPose = t + 1e-6 >= nextPose
  let mt = matteDir != nil && wantMatte(t)
  if !doPose && !mt { frame += 1; continue }
  let handler = VNImageRequestHandler(cvPixelBuffer: pb, orientation: orient, options: [:])
  let seg = VNGeneratePersonSegmentationRequest()
  seg.qualityLevel = mt ? .accurate : (doPose ? .balanced : .fast) // the drawn matte needs clean edges
  seg.outputPixelFormat = kCVPixelFormatType_OneComponent8
  let bodyReq = VNDetectHumanBodyPoseRequest()
  let handReq = VNDetectHumanHandPoseRequest()
  handReq.maximumHandCount = 2
  try? handler.perform(doPose ? [seg, bodyReq, handReq] : [seg])

  // matte -> small array at matteW
  var mask: [UInt8] = []
  var mw = 0, mh = 0
  if let mres = seg.results?.first {
    let mpb = mres.pixelBuffer
    let ci = CIImage(cvPixelBuffer: mpb)
    mw = matteW; mh = Int((Double(matteW) * Double(H) / Double(W)).rounded())
    let sx = CGFloat(mw) / ci.extent.width, sy = CGFloat(mh) / ci.extent.height
    let scaled = ci.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    mask = [UInt8](repeating: 0, count: mw * mh)
    mask.withUnsafeMutableBytes { buf in
      ctx.render(scaled, toBitmap: buf.baseAddress!, rowBytes: mw, bounds: CGRect(x: 0, y: 0, width: mw, height: mh), format: .L8, colorSpace: nil)
    }
  }

  if mt, let dir = matteDir, !mask.isEmpty {
    let m = mask
    // things in front of the room that are not the person (microphone, mic arm, the desk edge): Vision's foreground
    // instance mask (macOS 14+), measured on the same frame. They must stay in front of graphics behind the person too.
    var front = m
    if #available(macOS 14.0, *) {
      let fg = VNGenerateForegroundInstanceMaskRequest()
      if (try? handler.perform([fg])) != nil, let obs = fg.results?.first,
         let fpb = try? obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler) {
        let ci = CIImage(cvPixelBuffer: fpb)
        let sx = CGFloat(mw) / ci.extent.width, sy = CGFloat(mh) / ci.extent.height
        var fm = [UInt8](repeating: 0, count: mw * mh)
        fm.withUnsafeMutableBytes { buf in
          ctx.render(ci.transformed(by: CGAffineTransform(scaleX: sx, y: sy)), toBitmap: buf.baseAddress!, rowBytes: mw, bounds: CGRect(x: 0, y: 0, width: mw, height: mh), format: .L8, colorSpace: nil)
        }
        for i in 0..<(mw * mh) where fm[i] > front[i] { front[i] = fm[i] }
      }
    }
    // no growing here: this matte redraws the person over graphics behind him, a grown edge would show a halo of
    // the old background. Keeping graphics off the person is the job of the person grid (layout + check).
    // alpha = everything in front (person + foreground objects): the CSS alpha mask that redraws them on top.
    // colour = the person only (premultiplied): a CSS luminance mask gives the person alone (glows, outlines).
    var rgba = [UInt8](repeating: 255, count: mw * mh * 4)
    for i in 0..<(mw * mh) { let a = min(m[i], front[i]); rgba[i * 4] = a; rgba[i * 4 + 1] = a; rgba[i * 4 + 2] = a; rgba[i * 4 + 3] = front[i] }
    let cs = CGColorSpaceCreateDeviceRGB()
    if let prov = CGDataProvider(data: Data(rgba) as CFData),
       let img = CGImage(width: mw, height: mh, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: mw * 4, space: cs, bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: prov, decode: nil, shouldInterpolate: true, intent: .defaultIntent) {
      let f = URL(fileURLWithPath: dir).appendingPathComponent(String(format: "m_%06d.png", Int((t * fps).rounded())))
      if let dest = CGImageDestinationCreateWithURL(f as CFURL, UTType.png.identifier as CFString, 1, nil) {
        CGImageDestinationAddImage(dest, img, nil)
        CGImageDestinationFinalize(dest)
        matteCount += 1
        mH = mh
      }
    }
  }

  if doPose {
    nextPose += poseStep
    var parts: [String] = ["\"t\":\(f3(t))"]
    // joints
    var js: [String] = []
    if let b = (bodyReq.results ?? []).max(by: { ($0.confidence) < ($1.confidence) }) {
      for (jn, name) in jointNames {
        if let p = try? b.recognizedPoint(jn), p.confidence > 0.05 {
          let (x, y) = px(p.location)
          js.append("\"\(name)\":[\(f1(x)),\(f1(y)),\(f3(Double(p.confidence)))]")
        }
      }
    }
    parts.append("\"joints\":{\(js.joined(separator: ","))}")
    // hands
    var hs: [String] = []
    for h in handReq.results ?? [] {
      var ps: [String] = []
      for (jn, name) in handNames {
        if let p = try? h.recognizedPoint(jn), p.confidence > 0.05 {
          let (x, y) = px(p.location)
          ps.append("\"\(name)\":[\(f1(x)),\(f1(y)),\(f3(Double(p.confidence)))]")
        }
      }
      let side = h.chirality == .left ? "left" : h.chirality == .right ? "right" : "unknown"
      hs.append("{\"side\":\"\(side)\",\"conf\":\(f3(Double(h.confidence))),\"pts\":{\(ps.joined(separator: ","))}}")
    }
    parts.append("\"hands\":[\(hs.joined(separator: ","))]")
    // person grid + bbox
    if !mask.isEmpty {
      var rows: [String] = []
      var minX = GW, minY = GH, maxX = -1, maxY = -1, on = 0
      for gy in 0..<GH {
        var bits = [UInt8](repeating: 0, count: GW / 4)
        for gx in 0..<GW {
          let x0 = gx * mw / GW, x1 = max(x0 + 1, (gx + 1) * mw / GW), y0 = gy * mh / GH, y1 = max(y0 + 1, (gy + 1) * mh / GH)
          var hit = 0, n = 0
          for yy in y0..<y1 { for xx in x0..<x1 { n += 1; if mask[yy * mw + xx] > 96 { hit += 1 } } }
          if n > 0 && hit * 50 >= n { // 2 % of the cell is person -> the whole cell is person (conservative)
            bits[gx / 4] |= UInt8(8 >> (gx % 4)); on += 1
            minX = min(minX, gx); maxX = max(maxX, gx); minY = min(minY, gy); maxY = max(maxY, gy)
          }
        }
        rows.append(bits.map { String($0, radix: 16) }.joined())
      }
      let cw = Double(W) / Double(GW), ch = Double(H) / Double(GH)
      let bbox = maxX >= 0 ? "[\(f1(Double(minX) * cw)),\(f1(Double(minY) * ch)),\(f1(Double(maxX - minX + 1) * cw)),\(f1(Double(maxY - minY + 1) * ch))]" : "null"
      parts.append("\"person\":{\"bbox\":\(bbox),\"cover\":\(f3(Double(on) / Double(GW * GH))),\"rows\":[\(rows.map { "\"\($0)\"" }.joined(separator: ","))]}")
    } else {
      parts.append("\"person\":null")
    }
    samples.append("{\(parts.joined(separator: ","))}")
  }
  frame += 1
}

let matte = matteDir != nil ? ",\"matte\":{\"dir\":\"\(matteDir!)\",\"w\":\(matteW),\"h\":\(mH),\"fps\":\(f3(fps)),\"count\":\(matteCount),\"pattern\":\"m_%06d.png\"}" : ""
print("{\"width\":\(W),\"height\":\(H),\"fps\":\(f3(fps)),\"source\":\"macos-vision-body\",\"step\":\(f3(poseStep)),\"grid\":{\"w\":\(GW),\"h\":\(GH)},\"samples\":[\(samples.joined(separator: ","))]\(matte)}")
