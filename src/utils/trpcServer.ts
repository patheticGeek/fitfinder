import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCRequestInfo } from "@trpc/server/http";
import { getAppSession } from "~/utils/session";
import { prismaClient } from "./prisma";

type CreateTRPCContextOptions = {
	info: TRPCRequestInfo;
};

export const createTRPContext = async (_params: CreateTRPCContextOptions) => {
	const session = await getAppSession();

	return { session };
};

export type TRPCContext = Awaited<ReturnType<typeof createTRPContext>>;

export const t = initTRPC.context<TRPCContext>().create();

const authenticated = t.middleware(async ({ ctx, next }) => {
	if (!ctx.session.data.userId) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	const user = await prismaClient.user.findUnique({
		where: { id: ctx.session.data.userId },
		omit: { password: true },
	});

	if (!user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({ ctx: { ...ctx, user } });
});
export const authedProcedure = t.procedure.use(authenticated);
