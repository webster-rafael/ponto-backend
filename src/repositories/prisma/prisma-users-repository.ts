import { prisma } from "@/lib/prisma"
import { IUsersRepository } from "../users-repository"
import { Prisma, User } from "@prisma/client"

export class PrismaUsersRepository implements IUsersRepository {
    async findByEmail(email: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: {
                email,
            },
        })

        return user
    }

    async findById(id: string): Promise<User | null> {
        const user = await prisma.user.findUnique({
            where: {
                id,
            },
        })

        return user
    }

    async create(data: Prisma.UserCreateInput): Promise<User> {
        const user = await prisma.user.create({
            data,
        })

        return user
    }

    async save(user: User): Promise<User> {
        const updatedUser = await prisma.user.update({
            where: {
                id: user.id,
            },
            data: user,
        })

        return updatedUser
    }
}
