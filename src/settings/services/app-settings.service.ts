import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSettingDto } from '../dto/create-setting.dto';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import { SettingCategory } from '@prisma/client';

@Injectable()
export class AppSettingsService {
  constructor(private prisma: PrismaService) {}

  // Tous les paramètres
  async findAll(category?: SettingCategory) {
    const where = category ? { category } : {};

    return this.prisma.appSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  // Paramètres publics (pour API publique)
  async findPublic() {
    return this.prisma.appSetting.findMany({
      where: { isPublic: true },
      select: {
        key: true,
        value: true,
        type: true,
      },
    });
  }

  // Paramètre par clé
  async findByKey(key: string) {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException('Paramètre introuvable');
    }

    return setting;
  }

  // Valeur d'un paramètre (helper)
  async getValue(key: string, defaultValue?: string): Promise<string> {
    try {
      const setting = await this.findByKey(key);
      return setting.value;
    } catch {
      return defaultValue || '';
    }
  }

  // Créer un paramètre
  async create(data: CreateSettingDto) {
    return this.prisma.appSetting.create({
      data,
    });
  }

  // Modifier un paramètre
  async update(key: string, data: UpdateSettingDto) {
    const setting = await this.findByKey(key);

    if (!setting.isEditable) {
      throw new ConflictException('Ce paramètre n\'est pas modifiable');
    }

    return this.prisma.appSetting.update({
      where: { key },
      data,
    });
  }

  // Supprimer un paramètre
  async remove(key: string) {
    await this.findByKey(key);

    await this.prisma.appSetting.delete({ where: { key } });

    return { message: 'Paramètre supprimé avec succès' };
  }

  // Modifier plusieurs paramètres à la fois
  async updateBulk(updates: { key: string; value: string }[]) {
    const results = [];

    for (const update of updates) {
      const result = await this.prisma.appSetting.update({
        where: { key: update.key },
        data: { value: update.value },
      });
      results.push(result);
    }

    return results;
  }
}