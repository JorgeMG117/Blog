import NavHamburger from "./nav-hamburger";
import NavMobileMenu from "./nav-mobile-menu";
import NavLogo from "./nav-logo";
import NavBody from "./nav-body";
import { useState } from "react";
import { User } from "../types/api/types";

interface Props {
  user?: User;
}

export interface NavigationLink {
  text: string;
  route: string;
}

const navLinks: NavigationLink[] = [
  { text: "Home", route: "/home" },
  { text: "Posts", route: "/posts" },
  { text: "About", route: "/about" },
];

export default function Nav({ user }: Props) {
  const [menuState, setMenuState] = useState(false);

  return (
    <nav className="border-b border-b-gray-200 dark:border-b-zinc-700">
      <div className="max-w-6xl mx-auto px-2 sm:px-6 md:px-8">
        <div className="relative flex items-center justify-between h-16">
          <NavHamburger
            isMenuOpen={menuState}
            handleClick={() => setMenuState(!menuState)}
          />
          <div className="flex md:justify-center md:items-stretch">
            <NavLogo />
          </div>
          <div className="md:flex-1 flex justify-end md:justify-start">
            <NavBody user={user} navLinks={navLinks} />
          </div>
        </div>
      </div>
      <NavMobileMenu user={user} isMenuOpen={menuState} navLinks={navLinks} />
    </nav>
  );
}
