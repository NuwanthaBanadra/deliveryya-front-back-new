import { Menu, MenuButton, MenuItems } from '@headlessui/react';
import type { ReactNode } from 'react';

interface ProfileMenuProps {
  trigger: ReactNode;
  name: string;
  email: string;
  className?: string;
  buttonClassName?: string;
  itemsClassName?: string;
  headerClassName?: string;
  children: ReactNode;
}

function ProfileMenu({
  trigger,
  name,
  email,
  className = 'relative',
  buttonClassName,
  itemsClassName,
  headerClassName,
  children,
}: ProfileMenuProps) {
  return (
    <Menu as="div" className={className}>
      <MenuButton className={buttonClassName ?? 'contents'}>{trigger}</MenuButton>

      <MenuItems
        transition
        className={itemsClassName ?? 'absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-100 data-leave:ease-in overflow-hidden'}
      >
        <div className={headerClassName ?? 'bg-linear-to-r from-[#F59B0F] to-[#AC6C2A] px-5 py-4'}>
          <p className="text-base font-bold text-white">{name}</p>
          <p className="mt-1 text-sm text-orange-50">{email}</p>
        </div>
        <div className="p-2">{children}</div>
      </MenuItems>
    </Menu>
  );
}

export default ProfileMenu;