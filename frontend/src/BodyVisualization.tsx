import React from "react";
import "./BodyVisualization.css";

interface MuscleData {
  muscle: string;
  increase_kg: number;
}

interface Props {
  data: MuscleData[];
}

const musclePositions: { [key: string]: { top: string; left: string } } = {
  glutes: { top: "53%", left: "38%" },
  quads: { top: "66%", left: "43%" },
  biceps: { top: "38%", left: "28%" },
};

export default function BodyVisualization({ data }: Props) {
  return (
    <div className="body-container">
      <img src="/body-front.png" alt="body" className="body-image" />
      {data.map((m) => {
        const pos = musclePositions[m.muscle];
        if (!pos) return null;
        const color = `rgba(255, 0, 0, ${Math.min(m.increase_kg * 2, 1)})`;

        return (
          <div
            key={m.muscle}
            className="muscle-marker"
            style={{
              top: pos.top,
              left: pos.left,
              backgroundColor: color,
            }}
            title={`${m.muscle}: +${m.increase_kg}kg`}
          >
            +{m.increase_kg}kg
          </div>
        );
      })}
    </div>
  );
}
