import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Payment Service for Fastlipa API Integration
 * Handles payment link generation and payment processing
 */
export class PaymentService {
  constructor(pool) {
    this.pool = pool;
    this.fastlipaBaseUrl = process.env.FASTLIPA_BASE_URL || 'https://api.fastlipa.com';
    this.fastlipaApiKey = process.env.FASTLIPA_API_KEY;
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Generate a unique payment link
   */
  async generatePaymentLink({ amount, description, customerName, customerEmail, phoneNumber, returnUrl }) {
    try {
      // Generate unique payment link ID
      const paymentLinkId = uuidv4();
      const paymentLink = `${this.baseUrl}/pay/${paymentLinkId}`;

      // Save payment record to database
      const query = `
        INSERT INTO payments (
          payment_link_id, amount, currency, phone_number,
          customer_name, customer_email, description, return_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        paymentLinkId,
        amount,
        'TZS',
        phoneNumber,
        customerName,
        customerEmail,
        description,
        returnUrl,
        'pending'
      ];

      const { rows } = await this.pool.query(query, values);
      const payment = rows[0];

      return {
        success: true,
        paymentLink,
        paymentLinkId,
        payment
      };

    } catch (error) {
      console.error('Error generating payment link:', error);
      throw new Error(`Failed to generate payment link: ${error.message}`);
    }
  }

  /**
   * Get payment details by link ID
   */
  async getPaymentByLinkId(paymentLinkId) {
    try {
      const query = 'SELECT * FROM payments WHERE payment_link_id = $1';
      const { rows } = await this.pool.query(query, [paymentLinkId]);

      if (rows.length === 0) {
        return null;
      }

      return rows[0];
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Process payment with Fastlipa
   */
  async processPayment(paymentData) {
    try {
      // Prepare Fastlipa payment request
      // Format phone number to local format (remove country code)
      const localPhoneNumber = paymentData.phoneNumber.startsWith('255')
        ? paymentData.phoneNumber.substring(3) // Remove 255 prefix
        : paymentData.phoneNumber;

      // Use the amount as provided (Fastlipa handles currency conversion)
      const paymentPayload = {
        number: localPhoneNumber,
        amount: Math.round(parseFloat(paymentData.amount)), // Keep as whole number
        name: paymentData.customerName
      };

      // Make request to Fastlipa API using API key authentication only
      const response = await axios.post(
        `${this.fastlipaBaseUrl}/api/create-transaction`,
        paymentPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.fastlipaApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update payment record with Fastlipa response
      await this.updatePaymentStatus(
        paymentData.paymentLinkId,
        'processing',
        response.data
      );

      return {
        success: true,
        paymentId: response.data.tranid || response.data.transaction_id,
        status: response.data.status || 'pending',
        instructions: 'Payment initiated successfully. Use the transaction ID to check status.'
      };

    } catch (error) {
      console.error('Error processing payment:', error);

      // Update payment status to failed
      await this.updatePaymentStatus(
        paymentData.paymentLinkId,
        'failed',
        { error: error.message }
      );

      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(paymentLinkId, status, fastlipaResponse = null) {
    try {
      let updateData = {
        status,
        fastlipa_response: fastlipaResponse,
        updated_at: new Date()
      };

      // Set paid_at timestamp if payment is completed
      if (status === 'completed') {
        updateData.paid_at = new Date();
      }

      // Update external payment ID if provided
      if (fastlipaResponse && fastlipaResponse.payment_id) {
        updateData.external_payment_id = fastlipaResponse.payment_id;
      }

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');

      const query = `
        UPDATE payments
        SET ${setClause}
        WHERE payment_link_id = $${fields.length + 1}
        RETURNING *
      `;

      values.push(paymentLinkId);

      const { rows } = await this.pool.query(query, values);
      return rows[0];

    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }


  /**
   * Handle payment webhook from Fastlipa
   * This is specifically designed for Fastlipa webhook format
   */
  async handleFastlipaWebhook(webhookData, req) {
    try {
      // Log the complete webhook data for debugging
      console.log('🌐=== FASTLIPA WEBHOOK RECEIVED ===');
      console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📦 Body:', JSON.stringify(webhookData, null, 2));
      console.log('🕒 Timestamp:', new Date().toISOString());

      // Extract transaction information from various possible formats
      let transactionId = null;
      let status = 'unknown';
      let amount = null;
      let phoneNumber = null;

      // Fastlipa might send data in different formats
      // Try common patterns based on their API documentation

      if (webhookData.tranid) {
        transactionId = webhookData.tranid;
      } else if (webhookData.transaction_id) {
        transactionId = webhookData.transaction_id;
      } else if (webhookData.id) {
        transactionId = webhookData.id;
      }

      if (webhookData.status) {
        status = webhookData.status.toLowerCase();
      } else if (webhookData.state) {
        status = webhookData.state.toLowerCase();
      }

      if (webhookData.amount) {
        amount = parseFloat(webhookData.amount);
      }

      if (webhookData.number) {
        phoneNumber = webhookData.number;
      } else if (webhookData.phone_number) {
        phoneNumber = webhookData.phone_number;
      }

      console.log('🔍 Extracted Data:', {
        transactionId,
        status,
        amount,
        phoneNumber,
        fullData: webhookData
      });

      // Map Fastlipa status to our internal status
      let internalStatus = 'pending';
      switch (status) {
        case 'success':
        case 'successful':
        case 'completed':
        case 'paid':
          internalStatus = 'completed';
          break;
        case 'failed':
        case 'error':
        case 'cancelled':
        case 'canceled':
          internalStatus = 'failed';
          break;
        case 'pending':
        case 'processing':
        case 'initiated':
          internalStatus = 'processing';
          break;
        default:
          internalStatus = 'pending';
          console.log('⚠️ Unknown status received:', status);
      }

      // Find payment by external transaction ID or phone number
      let payment = null;

      if (transactionId) {
        // First try to find by external payment ID
        const query1 = 'SELECT * FROM payments WHERE external_payment_id = $1';
        const { rows: paymentsByExtId } = await this.pool.query(query1, [transactionId]);
        payment = paymentsByExtId[0];
      }

      if (!payment && phoneNumber) {
        // Fallback: try to find by phone number and recent timestamp
        const query2 = `
          SELECT * FROM payments
          WHERE phone_number = $1 AND created_at > NOW() - INTERVAL '1 hour'
          ORDER BY created_at DESC LIMIT 1
        `;
        const { rows: paymentsByPhone } = await this.pool.query(query2, [phoneNumber]);
        payment = paymentsByPhone[0];
      }

      if (!payment) {
        console.log('❌ No matching payment found for webhook');
        console.log('🔍 Searched by transactionId:', transactionId, 'and phoneNumber:', phoneNumber);

        // Log webhook for manual processing
        await this.logWebhookData(webhookData, 'no_matching_payment');
        return {
          success: false,
          message: 'No matching payment found',
          receivedData: { transactionId, phoneNumber, status }
        };
      }

      console.log('✅ Found matching payment:', payment.id, 'Current status:', payment.status);

      // Update payment status if it's different
      if (payment.status !== internalStatus) {
        await this.updatePaymentStatus(
          payment.payment_link_id,
          internalStatus,
          {
            webhookData,
            externalPaymentId: transactionId,
            fastlipaStatus: status,
            processedAt: new Date()
          }
        );

        console.log(`🔄 Updated payment ${payment.id} status: ${payment.status} → ${internalStatus}`);
      } else {
        console.log(`ℹ️ Payment ${payment.id} already has status: ${internalStatus}`);
      }

      // Log successful webhook processing
      await this.logWebhookData(webhookData, 'processed', payment.id);

      console.log('🌐=== WEBHOOK PROCESSED SUCCESSFULLY ===');

      return {
        success: true,
        message: 'Webhook processed successfully',
        paymentId: payment.id,
        previousStatus: payment.status,
        newStatus: internalStatus,
        transactionId
      };

    } catch (error) {
      console.error('❌ Error handling Fastlipa webhook:', error);

      // Log error for debugging
      await this.logWebhookData(webhookData, 'error', null, error.message);

      throw error;
    }
  }

  /**
   * Handle payment callback from Fastlipa (legacy method)
   */
  async handlePaymentCallback(callbackData) {
    try {
      console.log('📞=== FASTLIPA CALLBACK RECEIVED ===');
      console.log('📦 Callback Data:', JSON.stringify(callbackData, null, 2));

      const { paymentReference, status, paymentId } = callbackData;

      let newStatus = 'pending';
      switch (status?.toLowerCase()) {
        case 'success':
        case 'completed':
          newStatus = 'completed';
          break;
        case 'failed':
          newStatus = 'failed';
          break;
        case 'cancelled':
          newStatus = 'cancelled';
          break;
        default:
          newStatus = 'processing';
      }

      await this.updatePaymentStatus(paymentReference, newStatus, {
        callbackData,
        externalPaymentId: paymentId
      });

      console.log('📞=== CALLBACK PROCESSED ===');

      return { success: true };

    } catch (error) {
      console.error('Error handling payment callback:', error);
      throw error;
    }
  }

  /**
   * Log webhook data for debugging and audit purposes
   */
  async logWebhookData(webhookData, status, paymentId = null, error = null) {
    try {
      const query = `
        INSERT INTO webhook_logs (
          payment_id, webhook_data, status, error_message, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `;

      await this.pool.query(query, [
        paymentId,
        JSON.stringify(webhookData),
        status,
        error,
        new Date()
      ]);

    } catch (error) {
      console.error('Error logging webhook data:', error);
    }
  }

  /**
   * Check payment status with Fastlipa
   */
  async checkPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        `${this.fastlipaBaseUrl}/api/status-transaction`,
        {
          headers: {
            'Authorization': `Bearer ${this.fastlipaApiKey}`,
            'Content-Type': 'application/json'
          },
          params: {
            tranid: transactionId
          }
        }
      );

      return response.data;

    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error(`Failed to check payment status: ${error.message}`);
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats() {
    try {
      const query = `
        SELECT
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
        FROM payments
      `;

      const { rows } = await this.pool.query(query);
      return rows[0];

    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw new Error(`Failed to fetch payment statistics: ${error.message}`);
    }
  }
}