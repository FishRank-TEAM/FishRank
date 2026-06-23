import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CatchesModule } from './catches/catches.module';
import { RankingsModule } from './rankings/rankings.module';
import { SpeciesModule } from './species/species.module';
import { PostsModule } from './posts/posts.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { EncyclopediaModule } from './encyclopedia/encyclopedia.module';
import { FishInfoModule } from './fish-info/fish-info.module';
import { WeatherModule } from './weather/weather.module';
import { AdminModule } from './admin/admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CatchesModule,
    RankingsModule,
    SpeciesModule,
    PostsModule,
    TournamentsModule,
    EncyclopediaModule,
    FishInfoModule,
    WeatherModule,
    AdminModule,
    AnnouncementsModule,
    ReportsModule,
  ],
})
export class AppModule {}
