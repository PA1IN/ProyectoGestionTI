import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ADMIN_KEY = 'requireAdmin';
export const AdminOnly = () => SetMetadata(REQUIRE_ADMIN_KEY, true);