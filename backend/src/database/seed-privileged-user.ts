import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import AppDataSource from './data-source';
import { PerfilUsuario } from './entities/enums';
import { Usuario } from './entities/usuario.entity';

function isPrivilegedProfile(
  profile: string | undefined,
): profile is PerfilUsuario.SINDICO | PerfilUsuario.ADMIN {
  return profile === PerfilUsuario.SINDICO || profile === PerfilUsuario.ADMIN;
}

async function seedPrivilegedUser(dataSource: DataSource): Promise<void> {
  const {
    SEED_USER_NAME,
    SEED_USER_EMAIL,
    SEED_USER_PASSWORD,
    SEED_USER_PROFILE,
  } = process.env;

  if (
    !SEED_USER_NAME ||
    !SEED_USER_EMAIL ||
    !SEED_USER_PASSWORD ||
    !isPrivilegedProfile(SEED_USER_PROFILE)
  ) {
    throw new Error(
      'Defina SEED_USER_NAME, SEED_USER_EMAIL, SEED_USER_PASSWORD e SEED_USER_PROFILE (SINDICO ou ADMIN)',
    );
  }

  const repository = dataSource.getRepository(Usuario);
  const email = SEED_USER_EMAIL.trim().toLowerCase();
  const existingUser = await repository.findOneBy({ email });
  if (existingUser) {
    throw new Error(`Ja existe um usuario com o e-mail ${email}`);
  }

  const usuario = repository.create({
    nome: SEED_USER_NAME.trim(),
    email,
    senhaHash: await bcrypt.hash(SEED_USER_PASSWORD, 12),
    perfil: SEED_USER_PROFILE,
  });
  await repository.save(usuario);
  console.info(`Usuario ${usuario.perfil} criado: ${usuario.email}`);
}

async function main(): Promise<void> {
  try {
    await AppDataSource.initialize();
    await seedPrivilegedUser(AppDataSource);
  } catch (error) {
    console.error('Falha ao criar usuario privilegiado:', error);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main();
