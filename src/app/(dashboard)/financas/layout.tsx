import { FinancasTabs } from "@/components/financas-tabs";

export default function FinancasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy">Finanças</h1>
      <FinancasTabs />
      <div className="mt-5">{children}</div>
    </div>
  );
}
