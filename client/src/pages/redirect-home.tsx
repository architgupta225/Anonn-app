import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RedirectHome() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/");
  }, [navigate]);
  return null;
}


