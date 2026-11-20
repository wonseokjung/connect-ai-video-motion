// Push cut with flash, before to after: The old word punches out with a short gold flash and the new one lands (@remotion/transitions pushCut).
import React from 'react';
import {pushCut} from '@remotion/transitions/push-cut';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionPushCut: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => pushCut({flashColor: '#F2B45A', flashOpacity: 0.35})} />;
export default TransitionPushCut;
