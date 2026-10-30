import {
  Gamepad2Icon,
  HeadphonesIcon,
  LaptopIcon,
  type LucideProps,
  SmartphoneIcon,
  TabletIcon,
  WatchIcon,
} from "lucide-react";

const icons: Record<string, React.ComponentType<LucideProps>> = {
  smartphone: SmartphoneIcon,
  laptop: LaptopIcon,
  tablet: TabletIcon,
  watch: WatchIcon,
  headphones: HeadphonesIcon,
  gamepad: Gamepad2Icon,
};

export const CATEGORY_ICON_KEYS = Object.keys(icons);

/** Maps a Category.icon key from the database to a Lucide icon. */
export function CategoryIcon({ icon, ...props }: { icon: string | null } & LucideProps) {
  const Icon = icons[icon ?? ""] ?? SmartphoneIcon;
  return <Icon {...props} />;
}
