import { type FC } from "react";
import { getInitials } from "@/lib/email-signature";

interface UserIdentityProps {
  displayName?: string | null;
  email?: string | null;
}

export const UserIdentity: FC<UserIdentityProps> = ({ displayName, email }) => {
  if (!email) return <></>;

  const initials = getInitials(displayName, email);
  const hasName = displayName && displayName.trim().length > 0;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        {hasName ? (
          <>
            <p className="truncate text-sm leading-tight">{displayName}</p>
            <p className="text-muted-foreground truncate text-xs leading-tight">{email}</p>
          </>
        ) : (
          <p className="truncate text-sm leading-tight">{email}</p>
        )}
      </div>
    </div>
  );
};
