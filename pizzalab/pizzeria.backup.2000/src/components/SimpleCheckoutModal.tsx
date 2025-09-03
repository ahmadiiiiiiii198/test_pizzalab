import React, { useState, useEffect, useCallback } from 'react';
import { X, CreditCard, User, Mail, Phone, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CartItem, useSimpleCart } from '@/hooks/use-simple-cart';
import { supabase } from '@/integrations/supabase/client';
import shippingZoneService from '@/services/shippingZoneService';
import { useBusinessHoursContext } from '@/contexts/BusinessHoursContext';

import { getOrCreateClientIdentity } from '@/utils/clientIdentification';


interface SimpleCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalAmount: number;
}

const SimpleCheckoutModal: React.FC<SimpleCheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  totalAmount
}) => {
  const { toast } = useToast();
  const { validateOrderTime, isOpen: businessIsOpen, message: businessMessage } = useBusinessHoursContext();
  const { clearCart } = useSimpleCart();
  // Customer authentication removed - orders work without accounts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [addressValidation, setAddressValidation] = useState<any>(null);
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [customerData, setCustomerData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    deliveryAddress: ''
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomerData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        deliveryAddress: ''
      });
      setAddressValidation(null);

      // Force reload shipping zones from database
      shippingZoneService.reloadFromDatabase();
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  const generateOrderNumber = () => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp.slice(-6)}${random}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));

    // Handle automatic address validation with debouncing
    if (field === 'deliveryAddress') {
      setAddressValidation(null);

      // Clear existing timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      // Set new timeout for automatic validation (2 seconds after user stops typing)
      if (value.trim().length >= 5) {
        const timeout = setTimeout(() => {
          validateAddressAutomatically(value);
        }, 2000);
        setValidationTimeout(timeout);
      }
    }
  };

  const validateAddress = async (address: string) => {
    if (!address.trim()) {
      toast({
        title: 'Indirizzo Richiesto',
        description: 'Inserisci un indirizzo di consegna per continuare.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🔍 Validating address:', address);
    console.log('💰 Order amount:', totalAmount);

    setIsValidatingAddress(true);
    try {
      const result = await shippingZoneService.validateDeliveryAddress(address, totalAmount);
      console.log('✅ Validation result:', result);
      setAddressValidation(result);

      if (result.isValid && result.isWithinZone) {
        toast({
          title: 'Indirizzo Validato ✅',
          description: `Consegna disponibile - Distanza: ${result.distance?.toFixed(1)}km`,
        });
      } else {
        toast({
          title: 'Consegna Non Disponibile',
          description: result.error || 'Non possiamo consegnare a questo indirizzo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ Address validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nella validazione dell\'indirizzo';

      setAddressValidation({
        isValid: false,
        isWithinZone: false,
        distance: 0,
        deliveryFee: 0,
        estimatedTime: 'N/A',
        formattedAddress: address,
        coordinates: { lat: 0, lng: 0 },
        error: errorMessage
      });

      toast({
        title: 'Errore di Validazione',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Automatic address validation with debouncing
  const validateAddressAutomatically = useCallback(async (address: string) => {
    if (!address.trim() || address.length < 5) {
      setAddressValidation(null);
      return;
    }

    console.log('🔄 Auto-validating address:', address);
    setIsValidatingAddress(true);

    try {
      const result = await shippingZoneService.validateDeliveryAddress(address, totalAmount);
      console.log('✅ Auto-validation result:', result);
      setAddressValidation(result);

      // Don't show toast notifications for automatic validation
      // Only visual feedback through the UI
    } catch (error) {
      console.error('❌ Auto-validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore nella validazione dell\'indirizzo';

      setAddressValidation({
        isValid: false,
        isWithinZone: false,
        distance: 0,
        deliveryFee: 0,
        estimatedTime: 'N/A',
        formattedAddress: address,
        coordinates: { lat: 0, lng: 0 },
        error: errorMessage
      });
    } finally {
      setIsValidatingAddress(false);
    }
  }, [totalAmount]);

  const isFormValid = () => {
    const basicFormValid = customerData.customerName.trim() &&
                          customerData.customerEmail.trim() &&
                          customerData.deliveryAddress.trim() &&
                          addressValidation?.isValid;

    // Also check business hours (use synchronous state)
    return basicFormValid && businessIsOpen;
  };

  const calculateTotal = () => {
    const deliveryFee = addressValidation?.deliveryFee || 0;
    const subtotal = totalAmount || 0;
    const total = subtotal + deliveryFee;
    console.log('💰 calculateTotal - subtotal:', subtotal, 'deliveryFee:', deliveryFee, 'total:', total);
    return total;
  };

  const createStripeOrder = async () => {
    // Validate business hours
    const timeValidation = await validateOrderTime();
    if (!timeValidation.valid) {
      toast({
        title: 'Ordini non disponibili',
        description: timeValidation.message,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get client identity for order tracking
      const clientIdentity = await getOrCreateClientIdentity();
      console.log('🆔 Creating Simple Stripe order with client ID:', clientIdentity.clientId.slice(-12));

      // Create order in database with client identification and user authentication
      const orderData = {
        order_number: generateOrderNumber(),
        customer_name: customerData.customerName,
        customer_email: customerData.customerEmail,
        customer_phone: customerData.customerPhone || 'Non fornito',
        customer_address: customerData.deliveryAddress,
        delivery_type: 'delivery',
        total_amount: calculateTotal(),
        delivery_fee: addressValidation?.deliveryFee || 0,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'stripe',
        user_id: null, // 🎯 No authentication required for orders
        metadata: {
          // 🎯 CLIENT IDENTIFICATION FOR ORDER TRACKING
          clientId: clientIdentity.clientId,
          deviceFingerprint: clientIdentity.deviceFingerprint,
          sessionId: clientIdentity.sessionId,
          orderCreatedAt: new Date().toISOString(),
          isAuthenticatedOrder: false
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => {
        const extrasPrice = item.extras ?
          item.extras.reduce((total, extra) => total + (extra.price * extra.quantity * item.quantity), 0) : 0;
        const itemTotal = (item.product.price * item.quantity) + extrasPrice;

        return {
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          quantity: item.quantity,
          subtotal: itemTotal,
          unit_price: item.product.price,
          special_requests: item.specialRequests || null,
          toppings: item.extras ? item.extras.map(extra => `${extra.name} x${extra.quantity} (+€${extra.price})`) : null,
          metadata: {
            extras: item.extras || [],
            base_price: item.product.price * item.quantity,
            extras_price: extrasPrice
          }
        };
      });

      console.log('🔍 SimpleCheckout: Inserting order items:', orderItems);
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ SimpleCheckout: Order items insertion failed:', itemsError);
        console.error('❌ SimpleCheckout: Order items data that failed:', orderItems);
        throw new Error(`Errore nella creazione degli articoli dell'ordine: ${itemsError.message}`);
      }
      console.log('✅ SimpleCheckout: Order items created successfully');

      // Create standardized notification
      const { error: notificationError } = await supabase
        .from('order_notifications')
        .insert({
          order_id: order.id,
          notification_type: 'new_order',
          title: 'Nuovo Ordine!',
          message: `New order from ${customerData.customerName} - ${cartItems.length} items - €${calculateTotal().toFixed(2)}`,
          is_read: false,
          is_acknowledged: false
        });

      if (notificationError) {
        console.error('❌ Failed to create notification:', notificationError);
      } else {
        console.log('✅ Simple checkout notification created successfully');
      }

      // Prepare Stripe line items
      const stripeItems = cartItems.map(item => {
        const extrasPrice = item.extras ?
          item.extras.reduce((total, extra) => total + (extra.price * extra.quantity), 0) : 0;
        const itemTotalPrice = item.product.price + extrasPrice;

        let description = item.product.description || `${item.product.name} - Pizzeria Regina 2000`;
        if (item.extras && item.extras.length > 0) {
          const extrasText = item.extras.map(extra => `${extra.name} x${extra.quantity}`).join(', ');
          description += ` | Extra: ${extrasText}`;
        }
        if (item.specialRequests) {
          description += ` | Note: ${item.specialRequests}`;
        }

        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.product.name,
              description: description,
            },
            unit_amount: Math.round(itemTotalPrice * 100), // Convert to cents
          },
          quantity: item.quantity,
        };
      });

      // Add delivery fee as separate line item if applicable
      if (addressValidation?.deliveryFee && addressValidation.deliveryFee > 0) {
        stripeItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Costo di Consegna',
              description: `Consegna a ${customerData.deliveryAddress}`,
            },
            unit_amount: Math.round(addressValidation.deliveryFee * 100),
          },
          quantity: 1,
        });
      }

      // Prepare Stripe checkout session data
      const stripeData = {
        payment_method_types: ['card'],
        line_items: stripeItems,
        mode: 'payment',
        customer_email: customerData.customerEmail,
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['IT', 'FR', 'DE', 'ES', 'AT', 'CH'],
        },
        success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
        cancel_url: `${window.location.origin}/payment/cancel?order_id=${order.id}`,
        metadata: {
          order_id: order.id,
          customer_name: customerData.customerName,
          customer_phone: customerData.customerPhone || 'Non fornito',
          source: 'francesco_fiori_website',
          order_type: 'cart_order',
        }
      };

      console.log('📤 Creating Stripe checkout session...');
      console.log('📋 Stripe data:', JSON.stringify(stripeData, null, 2));

      // Use Netlify function for production, localhost for development
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3003/create-checkout-session'
        : '/.netlify/functions/create-checkout-session';

      console.log('🌐 Using API URL:', apiUrl);

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

      // Update order with Stripe session ID
      await supabase
        .from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', order.id);

      // ✅ Order saved to database - tracking handled by UnifiedOrderTracker
      console.log('✅ Order created and will be tracked via database-only system');
      console.log('✅ Simple Stripe order automatically saved for tracking:', order.order_number);

      // Redirect to Stripe
      console.log('🚀 Redirecting to Stripe...');
      window.location.href = session.url;

    } catch (error) {
      console.error('Stripe order error:', error);
      toast({
        title: 'Errore nel pagamento',
        description: error instanceof Error ? error.message : 'Si è verificato un errore',
        variant: 'destructive'
      });
    }
  };

  const createPayLaterOrder = async () => {
    // Validate business hours
    const timeValidation = await validateOrderTime();
    if (!timeValidation.valid) {
      toast({
        title: 'Ordini non disponibili',
        description: timeValidation.message,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Get client identity for order tracking
      const clientIdentity = await getOrCreateClientIdentity();
      console.log('🆔 Creating Simple PayLater order with client ID:', clientIdentity.clientId.slice(-12));

      // Create order in database with client identification and user authentication
      const orderData = {
        order_number: generateOrderNumber(),
        customer_name: customerData.customerName,
        customer_email: customerData.customerEmail,
        customer_phone: customerData.customerPhone || 'Non fornito',
        customer_address: customerData.deliveryAddress,
        delivery_type: 'delivery',
        total_amount: calculateTotal(),
        delivery_fee: addressValidation?.deliveryFee || 0,
        status: 'confirmed',
        payment_status: 'pending',
        payment_method: 'cash_on_delivery',
        user_id: null, // 🎯 No authentication required for orders
        metadata: {
          // 🎯 CLIENT IDENTIFICATION FOR ORDER TRACKING
          clientId: clientIdentity.clientId,
          deviceFingerprint: clientIdentity.deviceFingerprint,
          sessionId: clientIdentity.sessionId,
          orderCreatedAt: new Date().toISOString(),
          isAuthenticatedOrder: false
        }
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => {
        const extrasPrice = item.extras ?
          item.extras.reduce((total, extra) => total + (extra.price * extra.quantity * item.quantity), 0) : 0;
        const itemTotal = (item.product.price * item.quantity) + extrasPrice;

        return {
          order_id: order.id,
          product_id: item.product.id,
          product_name: item.product.name,
          product_price: item.product.price,
          quantity: item.quantity,
          subtotal: itemTotal,
          unit_price: item.product.price,
          special_requests: item.specialRequests || null,
          toppings: item.extras ? item.extras.map(extra => `${extra.name} x${extra.quantity} (+€${extra.price})`) : null,
          metadata: {
            extras: item.extras || [],
            base_price: item.product.price * item.quantity,
            extras_price: extrasPrice
          }
        };
      });

      console.log('🔍 SimpleCheckout PayLater: Inserting order items:', orderItems);
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ SimpleCheckout PayLater: Order items insertion failed:', itemsError);
        console.error('❌ SimpleCheckout PayLater: Order items data that failed:', orderItems);
        throw new Error(`Errore nella creazione degli articoli dell'ordine: ${itemsError.message}`);
      }
      console.log('✅ SimpleCheckout PayLater: Order items created successfully');

      // Create standardized notification
      const { error: notificationError } = await supabase
        .from('order_notifications')
        .insert({
          order_id: order.id,
          notification_type: 'new_order',
          title: 'Nuovo Ordine!',
          message: `New pay-later order from ${customerData.customerName} - ${cartItems.length} items - €${calculateTotal().toFixed(2)}`,
          is_read: false,
          is_acknowledged: false
        });

      if (notificationError) {
        console.error('❌ Failed to create pay-later notification:', notificationError);
      } else {
        console.log('✅ Pay-later simple checkout notification created successfully');
      }

      // ✅ Order saved to database - tracking handled by UnifiedOrderTracker
      console.log('✅ PayLater order created and will be tracked via database-only system');
      console.log('✅ Simple PayLater order automatically saved for tracking:', order.order_number);

      return order;

    } catch (error) {
      console.error('Pay later order error:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Checkout - {cartItems.length} Prodotti</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Riepilogo Ordine</h3>
            <div className="space-y-2 text-sm">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.product.name} x{item.quantity}</span>
                  <span>€{((typeof item.product.price === 'string' ? parseFloat(item.product.price) : (item.product.price || 0)) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotale:</span>
                  <span>€{(totalAmount || 0).toFixed(2)}</span>
                </div>
                {addressValidation?.deliveryFee && (
                  <div className="flex justify-between text-blue-600">
                    <span>Costo consegna ({addressValidation.zone}):</span>
                    <span>€{(addressValidation.deliveryFee || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg border-t pt-1">
                  <span>Totale:</span>
                  <span>€{(calculateTotal() || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium">Informazioni Cliente</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerName"
                    value={customerData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    className="pl-10"
                    placeholder="Il tuo nome completo"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    className="pl-10"
                    placeholder="la-tua-email@esempio.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="customerPhone">Telefono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="customerPhone"
                    value={customerData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    className="pl-10"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="deliveryAddress">Indirizzo di Consegna *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="deliveryAddress"
                      value={customerData.deliveryAddress}
                      onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                      className={`pl-10 ${
                        addressValidation?.isValid === false ? 'border-red-500' :
                        addressValidation?.isValid === true ? 'border-green-500' : ''
                      }`}
                      placeholder="Via, Città, CAP"
                    />
                    {isValidatingAddress && (
                      <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => validateAddress(customerData.deliveryAddress)}
                    disabled={!customerData.deliveryAddress.trim() || isValidatingAddress}
                    className="px-4"
                    title="Rivalidare manualmente l'indirizzo"
                  >
                    {isValidatingAddress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Rivalidare'
                    )}
                  </Button>
                </div>

                {/* Helper text */}
                {!addressValidation && !isValidatingAddress && (
                  <p className="text-sm text-gray-500 mt-1">
                    Inserisci il tuo indirizzo - la validazione avverrà automaticamente
                  </p>
                )}

                {isValidatingAddress && !addressValidation && (
                  <p className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Validazione automatica in corso...
                  </p>
                )}

                {/* Address Validation Status */}
                {addressValidation && (
                  <div className="mt-2 text-sm">
                    {addressValidation.isValid && addressValidation.isWithinZone ? (
                      <div className="text-green-600 bg-green-50 p-2 rounded">
                        ✓ Indirizzo valido - Distanza: {addressValidation.distance?.toFixed(1)}km
                        {addressValidation.deliveryFee > 0 && (
                          <span> - Costo consegna: €{addressValidation.deliveryFee.toFixed(2)}</span>
                        )}
                        <br />
                        <small className="text-green-500">
                          Tempo stimato: {addressValidation.estimatedTime}
                        </small>
                      </div>
                    ) : (
                      <div className="text-red-600 bg-red-50 p-2 rounded">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          {addressValidation.error || 'Indirizzo non valido o fuori zona di consegna'}
                        </div>
                        {addressValidation.distance && (
                          <small className="text-red-500 mt-1 block">
                            Distanza: {addressValidation.distance.toFixed(1)}km
                            {addressValidation.distance > 15 && ' (oltre il limite di 15km)'}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Opzioni di Pagamento</h3>

            {/* Business Hours Warning */}
            {!businessIsOpen && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                  <div>
                    <h4 className="font-semibold text-amber-800">Ordini non disponibili</h4>
                    <p className="text-amber-700 text-sm">{businessMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <Tabs defaultValue="stripe" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stripe">Paga Ora</TabsTrigger>
                <TabsTrigger value="later">Paga alla Consegna</TabsTrigger>
              </TabsList>

              <TabsContent value="stripe" className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Pagamento Immediato</h4>
                  <p className="text-blue-700 text-sm">
                    Paga subito con carta di credito tramite Stripe. Sicuro e veloce.
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await createStripeOrder();
                    } catch (error) {
                      console.error('Stripe payment error:', error);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={!isFormValid() || isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione ordine...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Paga €{(calculateTotal() || 0).toFixed(2)}
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="later" className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-800 mb-2">Paga alla Consegna</h4>
                  <p className="text-amber-700 text-sm">
                    Conferma l'ordine ora e paga quando ricevi i prodotti. Ti contatteremo per confermare i dettagli.
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      await createPayLaterOrder();
                      clearCart();
                      toast({
                        title: 'Ordine Confermato! ✅',
                        description: 'Ti contatteremo presto per confermare i dettagli.',
                      });
                      onClose();
                    } catch (error) {
                      console.error('Pay later order error:', error);
                      toast({
                        title: 'Errore nell\'ordine',
                        description: error instanceof Error ? error.message : 'Si è verificato un errore',
                        variant: 'destructive'
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={!isFormValid() || isSubmitting}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione ordine...
                    </>
                  ) : (
                    'Conferma Ordine'
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCheckoutModal;
