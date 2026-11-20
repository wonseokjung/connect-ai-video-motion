// Card flip, before to after: The card flips over on its middle and the new word is on the back (@remotion/transitions flip).
import React from 'react';
import {flip} from '@remotion/transitions/flip';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionFlip: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => flip({direction: 'from-bottom', perspective: 900})} />;
export default TransitionFlip;
