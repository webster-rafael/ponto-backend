import { IUsersRepository } from "@/repositories/users-repository"
import { User } from "@prisma/client"
import { ResourceNotFoundError } from "./errors/resource-not-found-error"

interface UpdateUserProfileUseCaseRequest {
    userId: string
    name: string
    avatarUrl?: string | null
}

interface UpdateUserProfileUseCaseResponse {
    user: User
}

export class UpdateUserProfileUseCase {
    constructor(private usersRepository: IUsersRepository) { }

    async execute({
        userId,
        name,
        avatarUrl
    }: UpdateUserProfileUseCaseRequest): Promise<UpdateUserProfileUseCaseResponse> {
        const user = await this.usersRepository.findById(userId)

        if (!user) {
            throw new ResourceNotFoundError()
        }

        user.name = name
        if (avatarUrl !== undefined) {
            (user as any).avatar_url = avatarUrl
        }

        const updatedUser = await this.usersRepository.save(user)

        return {
            user: updatedUser,
        }
    }
}
