import { prisma } from "./src/lib/prisma"
import { PreviewPunchUseCase } from "./src/use-cases/preview-punch"

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "webster@teste.com" } })
  if (!user) { console.log("Usuário não encontrado"); return }

  const result = await new PreviewPunchUseCase().execute({
    userId: user.id,
    type: "saida",
  })
  console.log(JSON.stringify(result, null, 2))
}

main().finally(() => prisma.$disconnect())
