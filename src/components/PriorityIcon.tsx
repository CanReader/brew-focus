import React from "react";
import { Priority } from "../types";
import { motion } from "framer-motion";

interface Props {
  priority: Priority;
  style?: React.CSSProperties;
  onClick?: () => void;
  active?: boolean;
}

const icons = new Map<Priority, string>([
  ["p1", "🥵"],
  ["p2", "😨"],
  ["p3", "🤨"],
  ["p4", "😊"],
]);

export const PriorityIcon: React.FC<Props> = ({ priority, style, onClick, active = false }) => {
  const emoji = icons.get(priority) || "🤨";

  return (
    <motion.button
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "34px", // Increased from 28px
        height: "34px", // Increased from 28px
        borderRadius: "10px",
        fontSize: "20px", // Increased from 16px
        cursor: "pointer",
        position: "relative",
        background: "transparent",
        border: "none",
        outline: "none",
        zIndex: 2, // Sits above the sliding background capsule
        ...style,
      }}
      title={`Priority ${priority.toUpperCase()}`}
    >
      <span 
        style={{
          filter: active ? "saturate(100%)" : "saturate(30%)",
          opacity: active ? 1 : 0.4,
          transition: "filter 0.2s, opacity 0.2s",
        }}
        className="hover:opacity-100 hover:filter-none"
      >
        {emoji}
      </span>
    </motion.button>
  );
};