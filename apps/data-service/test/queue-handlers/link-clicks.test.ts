import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleLinkClick } from '@/queue-handlers/link-clicks';
import * as linksModule from '@repo/data-ops/queries/links';
import * as routeOpsModule from '@/helpers/route-ops';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

// Mock the external modules
vi.mock('@repo/data-ops/queries/links');
vi.mock('@/helpers/route-ops');

describe('handleLinkClick', () => {
	const mockEnv = {
		EVALUATION_SCHEDULER: {
			idFromName: vi.fn(),
			get: vi.fn(),
		},
	} as unknown as Cloudflare.Env;

	const mockLinkClickEvent: LinkClickMessageType = {
		data: {
			id: 'click-123',
			accountId: 'account-456',
			destination: 'https://example.com',
			country: 'US',
			timestamp: new Date().toISOString(),
			latitude: 40.7128,
			longitude: -74.006,
		},
		type: 'LINK_CLICK',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('addLinkClick', () => {
		it('should call addLinkClick with event data', async () => {
			const addLinkClickSpy = vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const scheduleEvalWorkflowSpy = vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			await handleLinkClick(mockEnv, mockLinkClickEvent);

			expect(addLinkClickSpy).toHaveBeenCalledOnce();
			expect(addLinkClickSpy).toHaveBeenCalledWith(mockLinkClickEvent.data);
		});

		it('should insert click with all fields from event data', async () => {
			const addLinkClickSpy = vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			const eventData = {
				id: 'click-789',
				accountId: 'account-999',
				destination: 'https://test.com',
				country: 'GB',
				timestamp: '2025-01-15T10:30:00Z',
				latitude: 51.5074,
				longitude: -0.1278,
			};

			await handleLinkClick(mockEnv, mockLinkClickEvent);

			expect(addLinkClickSpy).toHaveBeenCalledWith(mockLinkClickEvent.data);
		});

		it('should handle clicks without geolocation data', async () => {
			const addLinkClickSpy = vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			const eventWithoutGeo = {
				data: {
					id: 'click-456',
					accountId: 'account-789',
					destination: 'https://example.com',
					country: undefined,
					timestamp: new Date().toISOString(),
					latitude: undefined,
					longitude: undefined,
				},
			} as unknown as LinkClickMessageType;

			await handleLinkClick(mockEnv, eventWithoutGeo);

			expect(addLinkClickSpy).toHaveBeenCalledWith(eventWithoutGeo.data);
		});

		it('should throw error if addLinkClick fails', async () => {
			const error = new Error('Database connection failed');
			vi.spyOn(linksModule, 'addLinkClick').mockRejectedValue(error);
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			await expect(handleLinkClick(mockEnv, mockLinkClickEvent)).rejects.toThrow('Database connection failed');
		});
	});

	describe('scheduleEvalWorkflow', () => {
		it('should call scheduleEvalWorkflow with env and event', async () => {
			vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const scheduleEvalWorkflowSpy = vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			await handleLinkClick(mockEnv, mockLinkClickEvent);

			expect(scheduleEvalWorkflowSpy).toHaveBeenCalledOnce();
			expect(scheduleEvalWorkflowSpy).toHaveBeenCalledWith(mockEnv, mockLinkClickEvent);
		});

		it('should schedule evaluation for different destinations', async () => {
			vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const scheduleEvalWorkflowSpy = vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			const event1 = {
				data: {
					...mockLinkClickEvent.data,
					destination: 'https://dest1.com',
				},
			} as LinkClickMessageType;

			const event2 = {
				data: {
					...mockLinkClickEvent.data,
					destination: 'https://dest2.com',
				},
			} as LinkClickMessageType;

			await handleLinkClick(mockEnv, event1);
			await handleLinkClick(mockEnv, event2);

			expect(scheduleEvalWorkflowSpy).toHaveBeenCalledTimes(2);
			expect(scheduleEvalWorkflowSpy).toHaveBeenNthCalledWith(1, mockEnv, event1);
			expect(scheduleEvalWorkflowSpy).toHaveBeenNthCalledWith(2, mockEnv, event2);
		});

		it('should throw error if scheduleEvalWorkflow fails', async () => {
			vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const error = new Error('Durable Object unavailable');
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockRejectedValue(error);

			await expect(handleLinkClick(mockEnv, mockLinkClickEvent)).rejects.toThrow('Durable Object unavailable');
		});
	});

	describe('integration', () => {
		it('should call both functions in correct order', async () => {
			const addLinkClickSpy = vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const scheduleEvalWorkflowSpy = vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			const callOrder: string[] = [];
			addLinkClickSpy.mockImplementation(async () => {
				callOrder.push('addLinkClick');
			});
			scheduleEvalWorkflowSpy.mockImplementation(async () => {
				callOrder.push('scheduleEvalWorkflow');
			});

			await handleLinkClick(mockEnv, mockLinkClickEvent);

			expect(callOrder).toEqual(['addLinkClick', 'scheduleEvalWorkflow']);
		});

		it('should handle multiple concurrent link clicks', async () => {
			vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockResolvedValue(undefined);

			const events = Array.from({ length: 5 }, (_, i) => ({
				data: {
					...mockLinkClickEvent.data,
					id: `click-${i}`,
					accountId: `account-${i}`,
				},
			})) as LinkClickMessageType[];

			const results = await Promise.all(events.map((event) => handleLinkClick(mockEnv, event)));

			expect(results).toHaveLength(5);
			expect(linksModule.addLinkClick).toHaveBeenCalledTimes(5);
			expect(routeOpsModule.scheduleEvalWorkflow).toHaveBeenCalledTimes(5);
		});

		it('should fail if addLinkClick succeeds but scheduleEvalWorkflow fails', async () => {
			vi.spyOn(linksModule, 'addLinkClick').mockResolvedValue(undefined);
			const error = new Error('Workflow scheduling failed');
			vi.spyOn(routeOpsModule, 'scheduleEvalWorkflow').mockRejectedValue(error);

			await expect(handleLinkClick(mockEnv, mockLinkClickEvent)).rejects.toThrow('Workflow scheduling failed');
		});
	});
});
