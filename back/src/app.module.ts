import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TeamFlagsModule } from './team-flags/team-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TeamFlagsModule,
  ],
})
export class AppModule {}
