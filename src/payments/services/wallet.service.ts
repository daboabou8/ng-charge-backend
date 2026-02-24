import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletTransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    return wallet;
  }

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance;
  }

  async credit(
    userId: string,
    amount: number,
    description: string,
    paymentId?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    // Créer la transaction
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        description,
        paymentId,
      },
    });

    // Mettre à jour le solde
    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    return { wallet: updatedWallet, transaction };
  }

  async debit(
    userId: string,
    amount: number,
    description: string,
    sessionId?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    // Créer la transaction
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amount: -amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance - amount,
        description,
        sessionId,
      },
    });

    // Mettre à jour le solde
    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return { wallet: updatedWallet, transaction };
  }

  async refund(
    userId: string,
    amount: number,
    description: string,
    sessionId?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.REFUND,
        amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + amount,
        description,
        sessionId,
      },
    });

    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    return { wallet: updatedWallet, transaction };
  }

  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const wallet = await this.getOrCreateWallet(userId);

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async canAfford(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }
}