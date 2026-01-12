import { z } from "zod";
import { hashPassword, prismaClient } from "~/utils/prisma";
import { t } from "~/utils/trpcServer";

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const SignupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const login = t.procedure
	.input(LoginSchema)
	.mutation(async ({ ctx, input }) => {
		const user = await prismaClient.user.findUnique({
			where: { email: input.email },
		});

		if (!user) {
			return {
				error: true,
				userNotFound: true,
				message: "User not found",
			};
		}

		const hashedPassword = await hashPassword(input.password);

		const userPassword = await prismaClient.userPassword.findUnique({
			where: { userId: user.id },
		});

		if (!userPassword || userPassword.hash !== hashedPassword) {
			return {
				error: true,
				message: "Incorrect password",
			};
		}

		await ctx.session.update({ userId: user.id });

		return { success: true };
	});

export const signup = t.procedure
	.input(SignupSchema)
	.mutation(async ({ ctx, input }) => {
		const found = await prismaClient.user.findUnique({
			where: { email: input.email },
		});

		const hashedPassword = await hashPassword(input.password);

		if (found) {
			const existingPassword = await prismaClient.userPassword.findUnique({
				where: { userId: found.id },
			});

			if (!existingPassword || existingPassword.hash !== hashedPassword) {
				return {
					error: true,
					userExists: true,
					message: "User already exists",
				};
			}

			await ctx.session.update({ userId: found.id });
			return { success: true };
		}

		const user = await prismaClient.user.create({
			data: {
				email: input.email,
			},
		});

		await prismaClient.userPassword.create({
			data: {
				userId: user.id,
				hash: hashedPassword,
			},
		});

		await ctx.session.update({ userId: user.id });

		return { success: true };
	});

export const logout = t.procedure.mutation(async ({ ctx }) => {
	ctx.session.clear();
	return { success: true };
});
