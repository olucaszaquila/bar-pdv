import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type Linha = [string, number, 'BAR' | 'COZINHA'];

async function main() {
  const existente = await prisma.estabelecimento.findFirst();
  if (existente) {
    await prisma.mesa.createMany({
      data: Array.from({ length: 50 }, (_, i) => ({ estabelecimentoId: existente.id, numero: i + 1 })),
      skipDuplicates: true,
    });
    console.log('Seed já aplicado; mesas conferidas até a 50.');
    return;
  }
  const est = await prisma.estabelecimento.create({ data: { nome: 'Bar Demo' } });
  const senhaHash = await bcrypt.hash('123456', 10);

  await prisma.usuario.createMany({
    data: [
      { nome: 'Admin', email: 'admin@demo.com', papel: 'ADMIN' as const },
      { nome: 'Carlos (garçom)', email: 'garcom@demo.com', papel: 'GARCOM' as const },
      { nome: 'Cozinha', email: 'cozinha@demo.com', papel: 'COZINHA' as const },
      { nome: 'Caixa', email: 'caixa@demo.com', papel: 'CAIXA' as const },
    ].map((u) => ({ ...u, senhaHash, estabelecimentoId: est.id })),
  });

  const cardapio: { nome: string; ordem: number; produtos: Linha[] }[] = [
    { nome: 'Bebidas', ordem: 1, produtos: [['Chopp 300ml', 1200, 'BAR'], ['Caipirinha', 2200, 'BAR'], ['Refrigerante lata', 600, 'BAR'], ['Água', 400, 'BAR']] },
    { nome: 'Porções', ordem: 2, produtos: [['Batata frita', 3800, 'COZINHA'], ['Isca de frango', 4500, 'COZINHA'], ['Calabresa acebolada', 4200, 'COZINHA']] },
    { nome: 'Pratos', ordem: 3, produtos: [['Parmegiana', 5900, 'COZINHA'], ['Feijoada', 5400, 'COZINHA']] },
  ];
  for (const c of cardapio) {
    await prisma.categoria.create({
      data: {
        estabelecimentoId: est.id,
        nome: c.nome,
        ordem: c.ordem,
        produtos: {
          create: c.produtos.map(([nome, precoCentavos, destino]) => ({
            estabelecimentoId: est.id,
            nome,
            precoCentavos,
            destino,
          })),
        },
      },
    });
  }

  await prisma.mesa.createMany({
    data: Array.from({ length: 50 }, (_, i) => ({ estabelecimentoId: est.id, numero: i + 1 })),
  });
  console.log('Seed ok. Login: admin@demo.com / garcom@demo.com / cozinha@demo.com / caixa@demo.com  (senha 123456)');
}

main().finally(() => prisma.$disconnect());
