// Push slide, before to after: The new word pushes the old one out of the card (@remotion/transitions slide).
import React from 'react';
import {slide} from '@remotion/transitions/slide';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionSlide: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => slide({direction: 'from-right'})} />;
export default TransitionSlide;
