import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletTransactionType } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  private readonly RECHARGE_PIN = process.env.WALLET_RECHARGE_PIN || 'NGWALLET123';

  constructor(private prisma: PrismaService) {}

  // ==================== GET OR CREATE WALLET ====================

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      this.logger.log(`💰 Creating new wallet for user: ${userId}`);

      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 200000, // 200K GNF par défaut
          currency: 'GNF',
        },
      });

      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTransactionType.BONUS,
          amount: 200000,
          balanceBefore: 0,
          balanceAfter: 200000,
          description: 'Bonus de bienvenue NG Wallet',
          reference: 'WELCOME_BONUS',
        },
      });
    }

    return wallet;
  }

  // ==================== CREDIT WALLET ====================

  async creditWallet(
    userId: string,
    amount: number,
    description: string,
    reference?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    this.logger.log(`💰 Crediting ${amount} GNF to wallet ${wallet.id}`);

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        description,
        reference,
      },
    });

    this.logger.log(`✅ Wallet credited: ${balanceBefore} → ${balanceAfter} GNF`);
    return updatedWallet;
  }

  // ==================== DEBIT WALLET ====================

  async debitWallet(
    userId: string,
    amount: number,
    description: string,
    reference?: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      const shortfall = amount - wallet.balance;
      this.logger.warn(`❌ Insufficient balance: ${wallet.balance} GNF, needed: ${amount} GNF`);
      throw new BadRequestException(
        `Solde insuffisant. Disponible: ${Math.round(wallet.balance)} GNF, Requis: ${Math.round(amount)} GNF. Manque: ${Math.round(shortfall)} GNF`,
      );
    }

    this.logger.log(`💸 Debiting ${amount} GNF from wallet ${wallet.id}`);

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    const updatedWallet = await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter },
    });

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.DEBIT,
        amount,
        balanceBefore,
        balanceAfter,
        description,
        reference,
      },
    });

    this.logger.log(`✅ Wallet debited: ${balanceBefore} → ${balanceAfter} GNF`);
    return updatedWallet;
  }

  // ==================== REFUND WALLET ====================

  async refundWallet(userId: string, amount: number, reference?: string) {
    this.logger.log(`🔄 Refunding ${amount} GNF to wallet for user ${userId}`);

    return this.creditWallet(
      userId,
      amount,
      `Remboursement - ${reference || 'Session arrêtée prématurément'}`,
      reference,
    );
  }

  // ==================== CAN AFFORD ====================

  async canAfford(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance >= amount;
  }

  // ==================== RECHARGE WITH PIN ====================

  async rechargeWithPin(userId: string, pin: string, amount: number) {
    this.logger.log(`🔑 PIN recharge attempt: ${userId}, amount: ${amount}`);

    if (pin !== this.RECHARGE_PIN) {
      this.logger.warn(`❌ Invalid PIN for user: ${userId}`);
      throw new BadRequestException('Code PIN invalide');
    }

    if (amount < 1000) {
      throw new BadRequestException('Montant minimum: 1000 GNF');
    }

    return this.creditWallet(
      userId,
      amount,
      `Recharge NG Wallet via PIN - ${amount} GNF`,
      `PIN-${Date.now()}`,
    );
  }

  // ==================== RECHARGE FROM BACKEND (ADMIN) ====================

  async rechargeFromBackend(userId: string, amount: number, description?: string) {
    this.logger.log(`💰 Admin recharge: ${amount} GNF for user ${userId}`);

    if (amount < 1000) {
      throw new BadRequestException('Le montant minimum est de 1000 GNF');
    }

    return this.creditWallet(
      userId,
      amount,
      description || `Recharge administrateur - ${amount} GNF`,
      `ADMIN-${Date.now()}`,
    );
  }

  // ==================== GET TRANSACTIONS ====================

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
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

  // ==================== GET BALANCE ====================

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance;
  }
}
