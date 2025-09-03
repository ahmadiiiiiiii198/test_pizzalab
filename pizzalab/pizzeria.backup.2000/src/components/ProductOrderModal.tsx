import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingCart, Plus, Minus, User, Mail, Phone, MapPin, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/category';
import shippingZoneService from '@/services/shippingZoneService';
import { useBusinessHoursContext } from '@/contexts/BusinessHoursContext';
import BusinessHoursStatus from './BusinessHoursStatus';
import { businessHoursService } from '@/services/businessHoursService';

// Customer authentication removed - orders work without accounts

// Direct payment button component - no abstractions
interface DirectPaymentButtonProps {
  product: Product;
  orderData: any;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const DirectPaymentButton: React.FC<DirectPaymentButtonProps> = ({
  product,
  orderData,
  onSuccess,
  onError
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDirectPayment = async () => {
    console.log('🚀 Direct payment button clicked');
    setIsProcessing(true);

    try {
      // ⏰ FIRST: Check business hours (should be visible to all users)
      console.log('🕒 Checking business hours...');
      const businessHoursValidation = await businessHoursService.validateOrderTime();
      if (!businessHoursValidation.valid) {
        throw new Error(businessHoursValidation.message);
      }
      console.log('✅ Business hours validation passed');

      // 🔓 Authentication removed - orders work without accounts

      console.log('🆔 Creating Product order for authenticated user');

      // Step 1: Create order directly
      console.log('📝 Creating order directly...');

      const totalAmount = (product.price || 0) * (orderData.quantity || 1);
      console.log('💰 ProductOrder - price:', product.price, 'quantity:', orderData.quantity, 'totalAmount:', totalAmount);

      // Create order with client identification and user authentication
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.customerName,
          customer_email: orderData.customerEmail,
          customer_phone: orderData.customerPhone || 'Non fornito',
          customer_address: orderData.deliveryAddress,
          delivery_type: 'delivery',
          total_amount: totalAmount,
          delivery_fee: addressValidation?.deliveryFee || 0,
          status: 'confirmed',
          payment_status: 'pending',
          payment_method: 'stripe',
          user_id: null, // Customer authentication removed - orders work without accounts
          special_instructions: `Product Order - ${product.name}\nQuantity: ${orderData.quantity}\nSpecial Requests: ${orderData.specialRequests}`,
          metadata: {
            product_id: product.id,
            product_name: product.name,
            quantity: orderData.quantity,
            unit_price: product.price,
            special_requests: orderData.specialRequests,
            // 🎯 CLIENT IDENTIFICATION FOR ORDER TRACKING
            clientId: clientIdentity.clientId,
            deviceFingerprint: clientIdentity.deviceFingerprint,
            sessionId: clientIdentity.sessionId,
            orderCreatedAt: new Date().toISOString(),
            isAuthenticatedOrder: false
          }
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Order creation failed:', orderError);
        throw new Error(`Order creation failed: ${orderError.message}`);
      }

      console.log('✅ Order created:', order.id);

      // Step 2: Create order item with correct schema
      const subtotal = product.price * orderData.quantity;

      const orderItemData = {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: orderData.quantity,
        subtotal: product.price * orderData.quantity,
        unit_price: product.price,
        special_requests: orderData.specialRequests
      };

      console.log('🔍 ProductOrder: Inserting order item:', orderItemData);
      const { error: itemError } = await supabase
        .from('order_items')
        .insert(orderItemData);

      if (itemError) {
        console.error('❌ ProductOrder: Order item creation failed:', itemError);
        console.error('❌ ProductOrder: Order item data that failed:', orderItemData);
        throw new Error(`Order item creation failed: ${itemError.message}`);
      }

      console.log('✅ Order item created');

      // Create standardized notification
      const { error: notificationError } = await supabase
        .from('order_notifications')
        .insert({
          order_id: order.id,
          notification_type: 'new_order',
          title: 'Nuovo Ordine!',
          message: `New product order from ${orderData.customerName} - ${product.name} x${orderData.quantity} - €${totalAmount.toFixed(2)}`,
          is_read: false,
          is_acknowledged: false
        });

      if (notificationError) {
        console.error('❌ Failed to create notification:', notificationError);
        // Don't throw error - notification failure shouldn't stop order creation
      } else {
        console.log('✅ Order notification created successfully');
      }

      // ✅ Order saved to database - tracking handled by UnifiedOrderTracker
      console.log('✅ Order created and will be tracked via database-only system');
      console.log('✅ Product order automatically saved for tracking:', order.order_number);

      // Step 3: Create Stripe session directly
      console.log('💳 Creating Stripe session...');
      console.log('📦 Product data:', JSON.stringify(product, null, 2));
      console.log('📋 Order data:', JSON.stringify(orderData, null, 2));

      // Validate product data
      if (!product.name || !product.name.trim()) {
        throw new Error('Product name is required');
      }
      if (!product.price || product.price <= 0) {
        throw new Error('Product price must be greater than 0');
      }
      if (!orderData.quantity || orderData.quantity <= 0) {
        throw new Error('Order quantity must be greater than 0');
      }

      const stripeData = {
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.name.trim(),
              description: (product.description || '').trim() || `${product.name.trim()} - Francesco Fiori`,
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: Math.max(1, Math.floor(orderData.quantity)),
        }],
        mode: 'payment',
        customer_email: orderData.customerEmail,
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['IT', 'FR', 'DE', 'ES', 'AT', 'CH'],
        },
        success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${window.location.origin}/payment/cancel?order_id=${order.id}`,
        metadata: {
          order_id: order.id,
          customer_name: orderData.customerName,
          customer_phone: orderData.customerPhone || 'Non fornito',
          source: 'francesco_fiori_website',
          order_type: 'product_order',
        }
      };

      // Use Netlify function for production, localhost for development
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3003/create-checkout-session'
        : '/.netlify/functions/create-checkout-session';

      console.log('🌐 Using API URL:', apiUrl);
      console.log('📤 Sending Stripe data:', JSON.stringify(stripeData, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripeData),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stripe server error response:', errorText);
        throw new Error(`Stripe error: ${response.status} - ${errorText}`);
      }

      const session = await response.json();
      console.log('✅ Stripe session created:', session.id);

      // Step 4: Redirect
      console.log('🚀 Redirecting to Stripe...');
      window.location.href = session.url;

    } catch (error) {
      console.error('❌ Direct payment failed:', error);
      onError(error.message);
      setIsProcessing(false);
    }
  };

  const total = product.price * orderData.quantity;

  return (
    <Button
      onClick={handleDirectPayment}
      disabled={isProcessing}
      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
      size="lg"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Processing Payment...
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5 mr-2" />
          Pay €{total.toFixed(2)} with Stripe
        </>
      )}
    </Button>
  );
};

interface ProductOrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  specialRequests: string;
  deliveryAddress: string;
}

const ProductOrderModal: React.FC<ProductOrderModalProps> = ({ product, isOpen, onClose }) => {
  const { toast } = useToast();
  const { validateOrderTime } = useBusinessHoursContext();
  // Customer authentication removed - orders work without accounts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  // Auth requirement removed
  const [addressValidation, setAddressValidation] = useState<any>(null);
  const [addressValidationTimeout, setAddressValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [orderData, setOrderData] = useState<OrderData>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    quantity: 1,
    specialRequests: '',
    deliveryAddress: ''
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (addressValidationTimeout) {
        clearTimeout(addressValidationTimeout);
      }
    };
  }, [addressValidationTimeout]);

  const handleInputChange = (field: keyof OrderData, value: string | number) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-validate address when it changes
    if (field === 'deliveryAddress') {
      setAddressValidation(null);

      // Debounce validation - validate after user stops typing for 1 second
      if (addressValidationTimeout) {
        clearTimeout(addressValidationTimeout);
      }

      const timeout = setTimeout(() => {
        if (typeof value === 'string' && value.trim().length > 10) {
          validateDeliveryAddress(value.trim());
        }
      }, 1000);

      setAddressValidationTimeout(timeout);
    }
  };

  const validateDeliveryAddress = async (addressToValidate?: string) => {
    const address = addressToValidate || orderData.deliveryAddress;

    if (!address.trim()) {
      if (!addressToValidate) {
        toast({
          title: 'Indirizzo Richiesto',
          description: 'Inserisci un indirizzo di consegna per continuare.',
          variant: 'destructive',
        });
      }
      return false;
    }

    setIsValidatingAddress(true);
    try {
      const result = await shippingZoneService.validateDeliveryAddress(
        address,
        calculateTotal()
      );

      setAddressValidation(result);

      if (!result.isValid || !result.isWithinZone) {
        // Only show error toast if this was a manual validation (not auto)
        if (!addressToValidate) {
          toast({
            title: 'Consegna Non Disponibile',
            description: result.error || 'Non possiamo consegnare a questo indirizzo.',
            variant: 'destructive',
          });
        }
        return false;
      }

      // Only show success toast if this was a manual validation (not auto)
      if (!addressToValidate) {
        toast({
          title: 'Indirizzo Validato ✅',
          description: 'Consegna disponibile',
        });
      }
      return true;
    } catch (error) {
      // Only show error toast if this was a manual validation (not auto)
      if (!addressToValidate) {
        toast({
          title: 'Errore Validazione',
          description: 'Impossibile validare l\'indirizzo. Riprova.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleQuantityChange = (increment: boolean) => {
    setOrderData(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + (increment ? 1 : -1))
    }));
  };

  const calculateTotal = () => {
    if (!product) return 0;
    const subtotal = product.price * orderData.quantity;
    const deliveryFee = addressValidation?.deliveryFee || 0;
    return subtotal + deliveryFee;
  };

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-6)}${random}`;
  };

  // Create order function for "pay later" option
  const createOrder = async () => {
    // ⏰ FIRST: Check business hours (should be visible to all users)
    const businessHoursValidation = await validateOrderTime();
    if (!businessHoursValidation.valid) {
      throw new Error(businessHoursValidation.message);
    }

    // 🔓 Authentication removed - orders work without accounts

    if (!product || !addressValidation?.isValid) {
      throw new Error('Product or address validation missing');
    }

    console.log('🆔 Creating Product PayLater order for authenticated user');

    const orderNumber = generateOrderNumber();
    const subtotal = (product.price || 0) * (orderData.quantity || 1);
    const deliveryFee = addressValidation.deliveryFee || 0;
    const totalAmount = subtotal + deliveryFee;
    console.log('💰 ProductOrder PayLater - price:', product.price, 'quantity:', orderData.quantity, 'subtotal:', subtotal, 'deliveryFee:', deliveryFee, 'totalAmount:', totalAmount);

    // Create order with client identification and user authentication
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_phone: orderData.customerPhone || 'Non fornito',
        customer_address: orderData.deliveryAddress, // Use customer_address column
        delivery_type: 'delivery',
        total_amount: totalAmount,
        delivery_fee: addressValidation.deliveryFee || 0,
        status: 'confirmed', // Orders are automatically confirmed
        payment_status: 'pending',
        payment_method: 'cash_on_delivery',
        user_id: null, // 🔓 No authentication required for orders
        metadata: {
          deliveryFee: addressValidation.deliveryFee,
          estimatedTime: addressValidation.estimatedTime,
          coordinates: addressValidation.coordinates,
          formattedAddress: addressValidation.formattedAddress,
          // 🎯 CLIENT IDENTIFICATION FOR ORDER TRACKING
          clientId: clientIdentity.clientId,
          deviceFingerprint: clientIdentity.deviceFingerprint,
          sessionId: clientIdentity.sessionId,
          orderCreatedAt: new Date().toISOString(),
          isAuthenticatedOrder: false
        },
        special_instructions: `Pay Later Order - Product: ${product.name}\nQuantity: ${orderData.quantity}\nSpecial Requests: ${orderData.specialRequests}`
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }

    // Create order item
    const orderItemData = {
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity: orderData.quantity,
      product_price: product.price,
      subtotal: product.price * orderData.quantity,
      unit_price: product.price,
      special_requests: orderData.specialRequests
    };

    console.log('🔍 ProductOrder PayLater: Inserting order item:', orderItemData);
    const { error: itemError } = await supabase
      .from('order_items')
      .insert(orderItemData);

    if (itemError) {
      console.error('❌ ProductOrder PayLater: Order item creation failed:', itemError);
      console.error('❌ ProductOrder PayLater: Order item data that failed:', orderItemData);
      throw new Error(`Order item creation failed: ${itemError.message}`);
    }
    console.log('✅ ProductOrder PayLater: Order item created successfully');

    // Create standardized notification
    const { error: notificationError } = await supabase
      .from('order_notifications')
      .insert({
        order_id: order.id,
        notification_type: 'new_order',
        title: 'Nuovo Ordine!',
        message: `New pay-later product order from ${orderData.customerName} - ${product.name} x${orderData.quantity} - €${totalAmount.toFixed(2)}`,
        is_read: false,
        is_acknowledged: false
      });

    if (notificationError) {
      console.error('❌ Failed to create pay-later notification:', notificationError);
    } else {
      console.log('✅ Pay-later product order notification created successfully');
    }

    // ✅ Order saved to database - tracking handled by UnifiedOrderTracker
    console.log('✅ PayLater order created and will be tracked via database-only system');
    console.log('✅ Product Pay Later order automatically saved for tracking:', order.order_number);

    return order;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // This will be handled by the payment tabs
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Ordina: {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Business Hours Status */}
          <BusinessHoursStatus variant="banner" />

          {/* Product Summary */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{product.name}</h3>
              <p className="text-gray-600 text-sm">{product.description}</p>
              <p className="text-xl font-bold text-emerald-600 mt-2">€{product.price.toFixed(2)}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo *
                </Label>
                <Input
                  id="customerName"
                  value={orderData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  placeholder="Il tuo nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email *
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={orderData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="la-tua-email@esempio.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefono *
              </Label>
              <Input
                id="customerPhone"
                value={orderData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                placeholder="+39 123 456 7890"
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Quantità</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(false)}
                  disabled={orderData.quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold w-12 text-center">{orderData.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuantityChange(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Indirizzo di Consegna *
                {isValidatingAddress && (
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                )}
                {addressValidation && addressValidation.isValid && addressValidation.isWithinZone && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
                {addressValidation && (!addressValidation.isValid || !addressValidation.isWithinZone) && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
              </Label>
              <Input
                id="deliveryAddress"
                value={orderData.deliveryAddress}
                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                placeholder="Via, Città, CAP (validazione automatica)"
                required
                className={`${
                  addressValidation
                    ? addressValidation.isValid && addressValidation.isWithinZone
                      ? 'border-green-300 focus:border-green-500'
                      : 'border-red-300 focus:border-red-500'
                    : ''
                }`}
              />

              {/* Address Validation Result */}
              {addressValidation && (
                <div className={`p-3 rounded-lg text-sm ${
                  addressValidation.isValid && addressValidation.isWithinZone
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {addressValidation.isValid && addressValidation.isWithinZone ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <div>
                        <div className="font-medium">✅ Consegna Disponibile</div>
                        {addressValidation.deliveryFee > 0 && (
                          <div>Costo consegna: €{addressValidation.deliveryFee.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <div>
                        <div className="font-medium">❌ Consegna Non Disponibile</div>
                        <div>{addressValidation.error || 'Indirizzo fuori dalla zona di consegna'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Special Requests */}
            <div className="space-y-2">
              <Label htmlFor="specialRequests">Richieste Speciali</Label>
              <Textarea
                id="specialRequests"
                value={orderData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                placeholder="Eventuali richieste particolari o personalizzazioni..."
                rows={3}
              />
            </div>

            {/* Total */}
            <div className="bg-emerald-50 p-4 rounded-lg">
              {addressValidation && addressValidation.isValid && addressValidation.isWithinZone ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotale:</span>
                    <span>€{((typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0)) * orderData.quantity).toFixed(2)}</span>
                  </div>
                  {addressValidation.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Consegna:</span>
                      <span>€{(addressValidation.deliveryFee || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                    <span>Totale:</span>
                    <span className="text-emerald-600">€{(calculateTotal() || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Subtotale:</span>
                  <span className="text-emerald-600">€{((typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0)) * orderData.quantity).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Payment Options */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Scegli il metodo di pagamento</h3>

              {/* Debug info */}
              <div className="text-xs text-gray-500 mb-2">
                Form valid: {orderData.customerName && orderData.customerEmail && orderData.customerPhone && orderData.deliveryAddress ? 'Yes' : 'No'} |
                Address validated: {addressValidation?.isValid && addressValidation?.isWithinZone ? 'Yes' : 'No'}
              </div>

              <Tabs defaultValue="stripe" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="stripe" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paga Ora (Stripe)
                  </TabsTrigger>
                  <TabsTrigger value="later">Paga Dopo</TabsTrigger>
                </TabsList>

                <TabsContent value="stripe" className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Pagamento Sicuro con Stripe</h4>
                    <p className="text-blue-700 text-sm">
                      Paga subito con carta di credito o debito. Il tuo ordine sarà confermato immediatamente.
                    </p>
                  </div>

                  {orderData.customerName && orderData.customerEmail && orderData.customerPhone && orderData.deliveryAddress &&
                   addressValidation?.isValid && addressValidation?.isWithinZone ? (
                    <DirectPaymentButton
                      product={product}
                      orderData={orderData}
                      onSuccess={() => {
                        toast({
                          title: 'Ordine Completato! 🎉',
                          description: 'Il pagamento è stato elaborato con successo.',
                        });
                        setOrderData({
                          customerName: '',
                          customerEmail: '',
                          customerPhone: '',
                          quantity: 1,
                          specialRequests: '',
                          deliveryAddress: ''
                        });
                        onClose();
                      }}
                      onError={(error) => {
                        toast({
                          title: 'Errore nel Pagamento',
                          description: error,
                          variant: 'destructive',
                        });
                      }}
                    />
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-lg">
                      <p className="text-amber-800 text-sm">
                        {!orderData.customerName || !orderData.customerEmail || !orderData.customerPhone || !orderData.deliveryAddress
                          ? 'Compila tutti i campi obbligatori sopra per procedere al pagamento.'
                          : !addressValidation?.isValid || !addressValidation?.isWithinZone
                          ? 'Valida l\'indirizzo di consegna prima di procedere al pagamento.'
                          : 'Compila tutti i campi per procedere al pagamento.'
                        }
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="later" className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Ordina Ora, Paga Dopo</h4>
                    <p className="text-gray-700 text-sm">
                      Il tuo ordine sarà salvato e ti contatteremo per confermare i dettagli e il pagamento.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmitting || !orderData.customerName || !orderData.customerEmail || !orderData.deliveryAddress ||
                               !addressValidation?.isValid || !addressValidation?.isWithinZone}
                      onClick={async () => {
                        setIsSubmitting(true);
                        try {
                          const order = await createOrder();
                          if (order) {
                            // Create notification for pay-later orders
                            await supabase
                              .from('order_notifications')
                              .insert({
                                order_id: order.id,
                                message: `New order received from ${orderData.customerName}`,
                                is_read: false
                              });

                            toast({
                              title: 'Ordine Inviato con Successo! 🎉',
                              description: `Il tuo ordine #${order.order_number} è stato ricevuto. Ti contatteremo presto per confermare i dettagli.`,
                            });

                            // Reset form and close modal
                            setOrderData({
                              customerName: '',
                              customerEmail: '',
                              customerPhone: '',
                              quantity: 1,
                              specialRequests: '',
                              deliveryAddress: ''
                            });
                            onClose();
                          }
                        } catch (error) {
                          toast({
                            title: 'Errore nell\'invio dell\'ordine',
                            description: error.message || 'Riprova o contattaci direttamente.',
                            variant: 'destructive',
                          });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Conferma Ordine
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </form>
        </div>
      </DialogContent>


    </Dialog>
  );
};

export default ProductOrderModal;
