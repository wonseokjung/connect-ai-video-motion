// Nothing that measures text is drawn before the font is there.
// fitText / measureText keep their results: a measurement taken with the fallback font would stay wrong for the
// whole render (letters too big for their box). So the graphics wait; the render waits with them (delayRender).
import React, {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {fontsReady} from '../brand';

export const FontGate: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    const go = () => {
      setReady(true);
      continueRender(handle);
    };
    fontsReady.then(go, go);
  }, [handle]);
  return ready ? <>{children}</> : null;
};
