import React from "react";

interface TypingIndicatorProps {
  userName: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <div className="flex items-center text-sm text-muted-foreground my-2">
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="ml-2">{userName} is typing...</span>
    </div>
  );
};

export default TypingIndicator;
