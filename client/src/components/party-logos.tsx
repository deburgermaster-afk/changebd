import sheafLogo from "@assets/generated_images/rice_sheaf_party_symbol.png";
import scalesLogo from "@assets/generated_images/balance_scales_party_symbol.png";
import ploughLogo from "@assets/generated_images/plough_party_symbol_icon.png";
import crescentLogo from "@assets/generated_images/crescent_moon_party_symbol.png";
import torchLogo from "@assets/generated_images/torch_flame_party_symbol.png";
import starLogo from "@assets/generated_images/star_party_symbol_icon.png";
import hammerSickleLogo from "@assets/generated_images/hammer_sickle_party_symbol.png";
import boatLogo from "@assets/generated_images/boat_party_symbol_icon.png";
import { User } from "lucide-react";

const partyLogos: Record<string, string> = {
  sheaf: sheafLogo,
  scales: scalesLogo,
  plough: ploughLogo,
  crescent: crescentLogo,
  torch: torchLogo,
  star: starLogo,
  "hammer-sickle": hammerSickleLogo,
  boat: boatLogo,
};

interface PartyLogoProps {
  symbol: string;
  className?: string;
  alt?: string;
}

export function PartyLogo({ symbol, className = "w-6 h-6", alt = "Party symbol" }: PartyLogoProps) {
  const logoSrc = partyLogos[symbol];
  
  if (!logoSrc) {
    return <User className={className} />;
  }

  return (
    <img 
      src={logoSrc} 
      alt={alt} 
      className={`${className} object-contain`}
    />
  );
}

export function getPartyLogoSrc(symbol: string): string | null {
  return partyLogos[symbol] || null;
}
