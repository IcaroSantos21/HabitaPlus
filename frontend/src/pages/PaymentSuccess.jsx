import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Card from "../components/Card";
import Loading from "../components/Loading";
import chargesService from "../services/chargesService";

function toList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const chargeId = searchParams.get("cobranca");
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState({
    loading: true,
    charge: null,
    error: "",
    confirmed: false,
  });

  useEffect(() => {
    let active = true;
    let timerId;
    let attempts = 0;

    async function checkStatus() {
      try {
        const response = await chargesService.list({
          pagina: 1,
          limite: 100,
        });
        if (!active) return;

        const charge = toList(response).find(
          (item) => String(item.id) === String(chargeId),
        );

        if (charge?.status === "PAGA") {
          setState({ loading: false, charge, error: "", confirmed: true });
          return;
        }

        attempts += 1;
        if (attempts < 8) {
          setState({
            loading: true,
            charge: charge || null,
            error: "",
            confirmed: false,
          });
          timerId = window.setTimeout(checkStatus, 1500);
          return;
        }

        setState({
          loading: false,
          charge: charge || null,
          error: charge
            ? "O Stripe ainda não confirmou o pagamento. Você pode atualizar novamente em instantes."
            : "Não foi possível localizar a cobrança. Consulte suas cobranças para verificar o status.",
          confirmed: false,
        });
      } catch (requestError) {
        if (!active) return;
        attempts += 1;
        if (attempts < 8) {
          timerId = window.setTimeout(checkStatus, 1500);
        } else {
          const message =
            requestError?.response?.data?.message ||
            "Não foi possível consultar o status da cobrança.";
          setState({
            loading: false,
            charge: null,
            error: Array.isArray(message) ? message.join(" ") : message,
            confirmed: false,
          });
        }
      }
    }

    if (!chargeId) {
      timerId = window.setTimeout(() => {
        if (!active) return;
        setState({
          loading: false,
          charge: null,
          error: "O retorno do Stripe não informou qual cobrança foi paga.",
          confirmed: false,
        });
      }, 0);
    } else {
      void checkStatus();
    }

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [chargeId, refreshKey]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card title="Retorno do pagamento" description="Estamos conferindo a confirmação enviada pelo Stripe.">
        {state.loading ? (
          <div className="space-y-3 py-4">
            <Loading label="Verificando o pagamento..." />
            <p className="text-sm text-muted">
              A confirmação pode levar alguns segundos porque o status é atualizado pelo webhook seguro do Stripe.
            </p>
            {state.charge && (
              <p className="text-sm">Cobrança #{state.charge.id} · {currency(state.charge.valor)}</p>
            )}
          </div>
        ) : state.confirmed ? (
          <div className="space-y-4">
            <Alert variant="success" title="Pagamento confirmado">
              O webhook atualizou a cobrança para paga.
            </Alert>
            <div className="flex flex-wrap items-center gap-3">
              <Badge status="PAGA" />
              <span className="font-semibold text-brand-navy">
                {currency(state.charge?.valor)}
              </span>
            </div>
            <p className="text-sm text-muted">Cobrança #{state.charge?.id}</p>
            <Link to="/charges" className="inline-block">
              <Button>Ver minhas cobranças</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="warning" title="Pagamento ainda não confirmado">
              {state.error || "O status continua aguardando a confirmação do Stripe."}
            </Alert>
            {state.charge && (
              <p className="text-sm text-muted">
                Cobrança #{state.charge.id} · Status: <Badge status={state.charge.status} />
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setRefreshKey((value) => value + 1)}>
                Consultar novamente
              </Button>
              <Link to="/charges">
                <Button variant="secondary">Voltar às cobranças</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default PaymentSuccess;
