import * as React from "react";
import { cn } from "../../lib/utils.js";

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("stock-chart-card", className)} {...props} />
));
Card.displayName = "Card";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("stock-chart-card-content", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardContent };
