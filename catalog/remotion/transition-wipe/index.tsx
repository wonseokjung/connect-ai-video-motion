// Diagonal wipe, before to after: A diagonal edge wipes the new word over the old one (@remotion/transitions wipe).
import React from 'react';
import {wipe} from '@remotion/transitions/wipe';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionWipe: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => wipe({direction: 'from-top-left'})} />;
export default TransitionWipe;
