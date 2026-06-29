import { useSearchParams } from "react-router-dom";
import { ConfirmationForm } from "@/components/ConfirmationForm";
import { CottageConfirmationForm } from "@/components/CottageConfirmationForm";

export default function NewConfirmation() {
  const [searchParams] = useSearchParams();
  if (searchParams.get("type") === "cottage") {
    return <CottageConfirmationForm />;
  }
  return <ConfirmationForm />;
}
