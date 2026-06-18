interface StatsCardProps {
  value: string;
  label: string;
  delay?: number;
}

const StatsCard = ({ value, label, delay = 0 }: StatsCardProps) => {
  return (
    <div 
      className="text-center p-6 animate-scale-in opacity-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">{value}</div>
      <div className="text-muted-foreground">{label}</div>
    </div>
  );
};

export default StatsCard;
