import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WeeksModule } from './weeks/weeks.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CronModule } from './cron/cron.module';
import { AppConfigModule } from './app-config/app-config.module';
import { ActivityReferencesModule } from './activity-references/activity-references.module';
import { RiskCategoriesModule } from './risk-categories/risk-categories.module';
import { RiskThemesModule } from './risk-themes/risk-themes.module';
import { FinancingFundsModule } from './financing-funds/financing-funds.module';
import { BudgetProjectsModule } from './budget-projects/budget-projects.module';
import { BudgetRecallsModule } from './budget-recalls/budget-recalls.module';
import { CostItemsModule } from './cost-items/cost-items.module';
import { PersonnelModule } from './personnel/personnel.module';
import { MissionsModule } from './missions/missions.module';
import { N8nModule } from './n8n/n8n.module';
import { PaymentRequestsModule } from './payment-requests/payment-requests.module';
import { BudgetMemosModule } from './budget-memos/budget-memos.module';
import { ConfigListsModule } from './config-lists/config-lists.module';
import { StockModule } from './stock/stock.module';
import { BriefModule } from './brief/brief.module';
import { CompilationModule } from './compilation/compilation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    WeeksModule,
    SubmissionsModule,
    DashboardModule,
    NotificationsModule,
    CronModule,
    AppConfigModule,
    ActivityReferencesModule,
    RiskCategoriesModule,
    RiskThemesModule,
    FinancingFundsModule,
    BudgetProjectsModule,
    BudgetRecallsModule,
    CostItemsModule,
    PersonnelModule,
    MissionsModule,
    N8nModule,
    PaymentRequestsModule,
    BudgetMemosModule,
    ConfigListsModule,
    StockModule,
    BriefModule,
    CompilationModule,
  ],
})
export class AppModule {}
