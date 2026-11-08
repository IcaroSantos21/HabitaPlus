import { Link, useSearchParams } from "react-router-dom";
import Alert from "../components/Alert";
import Button from "../components/Button";
import Card from "../components/Card";

function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const chargeId = searchParams.get("cobranca");

  return (
    <div className="mx-auto max-w-2xl">
      <Card title="Pagamento cancelado" description="Nenhuma confirmação de pagamento foi recebida.">
        <Alert variant="warning" title="Checkout não concluído">
          Você saiu da página de pagamento ou cancelou a operação. A cobrança continua com o status atual e pode ser paga posteriormente.
        </Alert>
        {chargeId && (
          <p className="mt-4 text-sm text-muted">Cobrança #{chargeId}</p>
        )}
        <Link to="/charges" className="mt-5 inline-block">
          <Button>Voltar para minhas cobranças</Button>
        </Link>
      </Card>
    </div>
  );
}

export default PaymentCancel;
