import React from 'react';
import {Composition} from 'remotion';
import {Props, Video} from './Video';
import example from '../example.props.json';

export const Root: React.FC = () => (
  <Composition
    id="SuperBrag"
    component={Video}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={300}
    defaultProps={example as unknown as Props}
    calculateMetadata={({props}) => ({durationInFrames: props.durationInFrames})}
  />
);
