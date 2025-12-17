import type { FC, HTMLAttributes } from "react";

export const Container: FC<
	HTMLAttributes<HTMLDivElement> & { size?: "sm" | "md" | "lg" }
> = ({ children, className, size = "lg", ...props }) => {
	const maxWidths: Record<string, string> = {
		sm: "max-w-xl",
		md: "max-w-3xl",
		lg: "max-w-6xl",
	};

	return (
		<div
			className={`${maxWidths[size]} mx-auto px-6 py-8 ${className ?? ""}`}
			{...props}
		>
			{children}
		</div>
	);
};

export default Container;
