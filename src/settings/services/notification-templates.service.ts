import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { NotificationType, NotificationChannel } from '@prisma/client';

@Injectable()
export class NotificationTemplatesService {
  constructor(private prisma: PrismaService) {}

  // Liste tous les templates
  async findAll(type?: NotificationType, channel?: NotificationChannel) {
    const where: any = {};
    if (type) where.type = type;
    if (channel) where.channel = channel;

    return this.prisma.notificationTemplate.findMany({
      where,
      orderBy: [{ type: 'asc' }, { channel: 'asc' }],
    });
  }

  // Templates actifs
  async findActive() {
    return this.prisma.notificationTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // Détails d'un template
  async findOne(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { notifications: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template introuvable');
    }

    return template;
  }

  // Template par nom
  async findByName(name: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { name },
    });

    if (!template) {
      throw new NotFoundException('Template introuvable');
    }

    return template;
  }

  // Créer un template
  async create(data: CreateTemplateDto) {
    // Vérifier si le nom existe déjà
    const existing = await this.prisma.notificationTemplate.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException('Un template avec ce nom existe déjà');
    }

    return this.prisma.notificationTemplate.create({
      data,
    });
  }

  // Modifier un template
  async update(id: string, data: UpdateTemplateDto) {
    await this.findOne(id);

    // Si changement de nom, vérifier unicité
    if (data.name) {
      const existing = await this.prisma.notificationTemplate.findUnique({
        where: { name: data.name },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Un template avec ce nom existe déjà');
      }
    }

    return this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
  }

  // Activer/Désactiver un template
  async toggleActive(id: string) {
    const template = await this.findOne(id);

    return this.prisma.notificationTemplate.update({
      where: { id },
      data: { isActive: !template.isActive },
    });
  }

  // Supprimer un template
  async remove(id: string) {
    const template = await this.findOne(id);

    if (template._count.notifications > 0) {
      throw new ConflictException(
        'Impossible de supprimer un template utilisé dans des notifications'
      );
    }

    await this.prisma.notificationTemplate.delete({ where: { id } });

    return { message: 'Template supprimé avec succès' };
  }

  // Rendre un template avec des variables
  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return rendered;
  }

  // Tester un template
  async testTemplate(id: string, sampleData: Record<string, any>) {
    const template = await this.findOne(id);

    const renderedSubject = template.subject
      ? this.renderTemplate(template.subject, sampleData)
      : null;

    const renderedBody = this.renderTemplate(template.body, sampleData);

    return {
      template: {
        name: template.name,
        type: template.type,
        channel: template.channel,
      },
      sampleData,
      rendered: {
        subject: renderedSubject,
        body: renderedBody,
      },
    };
  }
}