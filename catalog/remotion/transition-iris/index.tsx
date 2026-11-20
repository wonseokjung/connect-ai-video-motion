// Iris, before to after: A circle opens from the middle and shows the new word (@remotion/transitions iris).
import React from 'react';
import {iris} from '@remotion/transitions/iris';
import {GraphicProps} from '../../../src/catalog/ui';
import {TransitionWords} from '../_shared/TransitionWords';

const TransitionIris: React.FC<GraphicProps> = (p) => <TransitionWords {...p} make={(w, h) => iris({width: w, height: h})} />;
export default TransitionIris;
