import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth_required">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus("auth_required");
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMsg("Lien d'invitation invalide.");
      return;
    }

    const accept = async () => {
      const { data, error } = await supabase.rpc("accept_team_invitation", {
        invitation_token: token,
      });

      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
        return;
      }

      const result = data as any;
      if (result?.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(result?.error || "Erreur inconnue");
      }
    };

    accept();
  }, [user, authLoading, token]);

  if (status === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "auth_required") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <h2 className="text-xl font-bold">Connexion requise</h2>
            <p className="text-muted-foreground">
              Vous devez vous connecter ou créer un compte pour accepter cette invitation.
            </p>
            <Button onClick={() => navigate(`/?redirect=/accept-invitation?token=${token}`)}>
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-4">
          {status === "success" ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold">Invitation acceptée !</h2>
              <p className="text-muted-foreground">
                Vous avez maintenant accès aux données de gestion. Rendez-vous sur le tableau de bord hôte.
              </p>
              <Button onClick={() => navigate("/host/dashboard")}>
                Accéder au tableau de bord
              </Button>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold">Erreur</h2>
              <p className="text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate("/")}>
                Retour à l'accueil
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
