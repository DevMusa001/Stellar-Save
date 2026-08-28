import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Auth controller for Stellar wallet-based authentication.
 * All endpoints are rate-limited at 10 req/15min per IP.
 *
 * Endpoints:
 *   POST /auth/challenge          — Request sign challenge
 *   POST /auth/verify             — Verify signature → access + refresh tokens
 *   POST /auth/refresh            — Rotate refresh token → new token pair
 *   POST /auth/logout             — Revoke current session family
 *   POST /auth/logout-everywhere  — Revoke all sessions (requires JWT)
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/challenge
   * Body: { walletAddress: string }
   * Returns: { challenge: string }
   *
   * Generate a signing challenge for wallet authentication.
   */
  @Post('challenge')
  async generateChallenge(@Body() body: { walletAddress: string }) {
    const { walletAddress } = body;
    const challenge = await this.authService.generateChallenge(walletAddress);
    return { challenge };
  }

  /**
   * POST /auth/verify
   * Body: { walletAddress: string, challenge: string, signature: string }
   * Returns: { accessToken: string, refreshToken: string }
   *
   * Verify wallet signature and issue JWT token pair.
   */
  @Post('verify')
  async verifySignature(
    @Body() body: {
      walletAddress: string;
      challenge: string;
      signature: string;
    }
  ) {
    const { walletAddress, challenge, signature } = body;
    const tokens = await this.authService.verifySignature(
      walletAddress,
      challenge,
      signature
    );
    return tokens;
  }

  /**
   * POST /auth/refresh
   * Body: { refreshToken: string }
   * Returns: { accessToken: string, refreshToken: string }
   *
   * Rotate refresh token (one-time-use). Reuse invalidates the whole family.
   */
  @Post('refresh')
  async rotateRefreshToken(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;
    const tokens = await this.authService.rotateRefreshToken(refreshToken);
    return tokens;
  }

  /**
   * POST /auth/logout
   * Body: { refreshToken: string }
   * Returns: { message: string }
   *
   * Revoke the session family (no JWT required — token is proof).
   */
  @Post('logout')
  async logout(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;
    await this.authService.revokeSession(refreshToken);
    return { message: 'Logged out' };
  }

  /**
   * POST /auth/logout-everywhere
   * Headers: { Authorization: Bearer <accessToken> }
   * Returns: { message: string }
   *
   * Revoke ALL sessions for the authenticated wallet.
   */
  @Post('logout-everywhere')
  async logoutEverywhere(@Req() req: any) {
    const walletAddress = req.walletAddress;
    await this.authService.revokeAllSessions(walletAddress);
    return { message: 'All sessions revoked' };
  }
}
