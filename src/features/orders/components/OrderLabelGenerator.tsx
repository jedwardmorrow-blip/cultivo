interface OrderLabelGeneratorProps {
  orderId: string;
}

export function OrderLabelGenerator({ orderId }: OrderLabelGeneratorProps) {
  return (
    <button className="px-4 py-2 bg-cult-medium-gray text-cult-white hover:bg-cult-light-gray transition-all font-medium uppercase tracking-wider text-sm">
      Generate Labels
    </button>
  );
}
