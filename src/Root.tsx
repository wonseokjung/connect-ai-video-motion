import React from 'react';
import {Composition} from 'remotion';
import {FaceMotion, calcFaceMotion} from './fm/FaceMotion';
import {Sheet, calcSheet} from './fm/Sheet';
import {StandIn} from './standin/StandIn';
import {FaceSheet, calcFaceSheet} from './fm/FaceSheet';
import {Readme, calcReadme} from './fm/Readme';
import {Gallery, GallerySheet, calcGallery} from './fm/Gallery';
import {BodySheet, calcBodySheet} from './fm/BodySheet';
import {MediaPipeProbe} from './fm/MediaPipeProbe';
import {MediaPipeFaceProbe} from './fm/MediaPipeFaceProbe';
import {Showcase, ShowcaseCut, calcShowcase, calcShowcaseCut} from './fm/Showcase';

// connect-ai-video-motion: FaceMotion (16:9), FaceMotionShort (9:16), Sheet (still sheet for check).
// Data comes from the project folder (the CLI passes it in; the Studio reads it from the public dir).
export const Root: React.FC = () => (
  <>
    <Composition id="FaceMotion" component={FaceMotion} calculateMetadata={calcFaceMotion} defaultProps={{aspect: '16x9', mode: 'final', guides: true, showWords: true}} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="FaceMotionShort" component={FaceMotion} calculateMetadata={calcFaceMotion} defaultProps={{aspect: '9x16', mode: 'final', guides: true, showWords: false}} durationInFrames={300} fps={30} width={1080} height={1920} />
    <Composition id="Sheet" component={Sheet} calculateMetadata={calcSheet} defaultProps={{aspect: '16x9', mode: 'final', guides: true}} durationInFrames={1} fps={30} width={1000} height={1000} />
    <Composition id="Readme" component={Readme as any} calculateMetadata={calcReadme as any} defaultProps={{kind: 'compare', a: {data: null, aspect: '16x9'}, b: {data: null, aspect: '16x9'}} as any} durationInFrames={300} fps={30} width={1920} height={1080} />
    <Composition id="FaceSheet" component={FaceSheet} calculateMetadata={calcFaceSheet} defaultProps={{meta: {file: 'video.mp4', width: 1920, height: 1080, fps: 30, duration: 4}}} durationInFrames={1} fps={30} width={1000} height={1000} />
    <Composition id="Gallery" component={Gallery} calculateMetadata={calcGallery} defaultProps={{secs: 2}} durationInFrames={60} fps={30} width={1280} height={720} />
    <Composition id="GallerySheet" component={GallerySheet} calculateMetadata={calcGallery} defaultProps={{secs: 2, sheet: true}} durationInFrames={1} fps={30} width={1000} height={1000} />
    <Composition id="BodySheet" component={BodySheet} calculateMetadata={calcBodySheet} defaultProps={{}} durationInFrames={1} fps={30} width={1000} height={1000} />
    <Composition id="Showcase" component={Showcase} calculateMetadata={calcShowcase} defaultProps={{}} durationInFrames={90} fps={30} width={1920} height={1080} />
    <Composition id="ShowcaseCut" component={ShowcaseCut as any} calculateMetadata={calcShowcaseCut as any} defaultProps={{kind: 'remotion/transition-iris', secs: 4} as any} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="MediaPipeProbe" component={MediaPipeProbe as any} defaultProps={{frames: [], width: 1920, height: 1080} as any} calculateMetadata={({props}: any) => ({durationInFrames: Math.max(1, props.frames?.length || 1)})} durationInFrames={1} fps={30} width={64} height={36} />
    <Composition id="MediaPipeFaceProbe" component={MediaPipeFaceProbe as any} defaultProps={{frames: []} as any} calculateMetadata={({props}: any) => ({durationInFrames: Math.max(1, props.frames?.length || 1)})} durationInFrames={1} fps={30} width={64} height={36} />
    <Composition id="StandIn" component={StandIn} defaultProps={{variant: 'sample10', seconds: 12}} calculateMetadata={({props}) => ({durationInFrames: Math.round((props.seconds || 12) * 30)})} durationInFrames={360} fps={30} width={1920} height={1080} />
  </>
);
