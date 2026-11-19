// Face adapter (a): Apple Vision, macOS only, nothing to install. Our own code.
// usage: swift vision-face.swift <video> <stepSeconds>
// prints JSON: {"width":W,"height":H,"source":"macos-vision","samples":[{"t":0.0,"box":[x,y,w,h],"conf":0.97}]}
// box is in video pixels, origin top-left; conf 0 = no face found at that time.
import AVFoundation
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: vision-face.swift <video> [step]"); exit(2) }
let url = URL(fileURLWithPath: args[1])
let step = args.count >= 3 ? Double(args[2]) ?? 0.5 : 0.5
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let duration = CMTimeGetSeconds(asset.duration)
var samples: [String] = []
var W = 0, H = 0
var t = 0.0
while t <= duration {
  let time = CMTime(seconds: t, preferredTimescale: 600)
  if let img = try? gen.copyCGImage(at: time, actualTime: nil) {
    W = img.width; H = img.height
    let req = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: img, options: [:])
    try? handler.perform([req])
    let faces = (req.results ?? []).sorted { $0.boundingBox.width * $0.boundingBox.height > $1.boundingBox.width * $1.boundingBox.height }
    if let f = faces.first {
      let b = f.boundingBox
      // Vision gives the face only (brows to chin): grow it to the whole head (hair, ears).
      let w = Double(b.width) * Double(W), h = Double(b.height) * Double(H)
      let x = Double(b.minX) * Double(W) - w * 0.12
      let y = (1 - Double(b.maxY)) * Double(H) - h * 0.35
      samples.append(String(format: "{\"t\":%.3f,\"box\":[%.1f,%.1f,%.1f,%.1f],\"conf\":%.3f}", t, x, y, w * 1.24, h * 1.5, Double(f.confidence)))
    } else {
      samples.append(String(format: "{\"t\":%.3f,\"box\":null,\"conf\":0}", t))
    }
  }
  t += step
}
print("{\"width\":\(W),\"height\":\(H),\"source\":\"macos-vision\",\"samples\":[\(samples.joined(separator: ","))]}")
