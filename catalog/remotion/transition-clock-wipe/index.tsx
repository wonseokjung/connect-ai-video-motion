// Clock wipe, before to after: The first word is swept away by a clock hand and the second is under it (@remotion/transitions clockWipe).
import React from 'react';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionClockWipe: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => clockWipe({width: w, height: h})} />;
export default TransitionClockWipe;
