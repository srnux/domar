import type { UserDto } from "@domar/shared";
import { avatarGradient, initials } from "@/components/agenda/agenda-layout";
import { cn } from "./cn";

type AvatarUser = Pick<UserDto, "id" | "name" | "avatarFilename">;

/**
 * Round user avatar: the uploaded image when present, otherwise the
 * deterministic gradient + initials used elsewhere in the app. The `?v=`
 * query busts the browser cache after a re-upload (filename changes).
 */
export function UserAvatar({
  user,
  size = 32,
  className,
}: {
  user: AvatarUser;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  if (user.avatarFilename) {
    return (
      <img
        src={`/api/users/${user.id}/avatar?v=${user.avatarFilename}`}
        alt={user.name}
        style={dimension}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, background: avatarGradient(user.id) }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-surface",
        className,
      )}
      aria-hidden
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>
        {initials(user.name)}
      </span>
    </span>
  );
}
