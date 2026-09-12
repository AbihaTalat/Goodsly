import React from "react";

const colorValues = {
  "Near Black": "#18181b",
  Black: "#18181b",
  Bone: "#e8e1d2",
  Ivory: "#f7f5ed",
  Olive: "#596346",
  Stone: "#aaa89d",
  "Muted Gold": "#c4a35a",
  Gold: "#c4a35a",
};

const colorNames = (color) => color.split("/").map((value) => value.trim()).filter(Boolean);

const ColorSwatches = ({ color, className = "" }) => (
  <span className={`color-swatches ${className}`.trim()} aria-label={`Available colors: ${color}`}>
    {colorNames(color).map((name) => (
      <span className="catalogue-color" key={name} title={name}>
        <i style={{ backgroundColor: colorValues[name] || "#88867d" }} aria-hidden="true" />
        <span>{name}</span>
      </span>
    ))}
  </span>
);

export default ColorSwatches;
