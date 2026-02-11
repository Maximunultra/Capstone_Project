import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://capstone-project-1msq.onrender.com/api';

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [userReview, setUserReview] = useState(null);
  const [editingReview, setEditingReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get user info from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;
  const userRole = currentUser.role;

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      const data = await response.json();
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      // Fetch all reviews for the product
      const response = await fetch(`${API_BASE_URL}/feedback/product/${id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const data = await response.json();
      setReviews(data);

      // Check if current user has already reviewed this product
      if (userId) {
        const userReviewData = data.find(review => review.user_id === userId);
        if (userReviewData) {
          setUserReview(userReviewData);
          setRating(userReviewData.rating);
          setComment(userReviewData.comment);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    }
  };

  const handleSubmitReview = async () => {
    if (!userId) {
      alert('Please log in to submit a review');
      return;
    }

    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      alert('Please write a comment');
      return;
    }
    if (comment.trim().length < 10) {
      alert('Comment must be at least 10 characters long');
      return;
    }

    setSubmitting(true);

    try {
      if (userReview && editingReview) {
        // Update existing review
        const response = await fetch(`${API_BASE_URL}/feedback/${userReview.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            comment: comment.trim(),
            user_id: userId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update review');
        }

        alert('Review updated successfully!');
        setEditingReview(false);
      } else {
        // Create new review
        const response = await fetch(`${API_BASE_URL}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: parseInt(id),
            user_id: userId,
            rating,
            comment: comment.trim()
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to submit review');
        }

        alert('Review submitted successfully!');
      }

      // Refresh reviews and product data (to update rating stats)
      await fetchReviews();
      await fetchProduct();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/feedback/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete review');
      }

      alert('Review deleted successfully!');
      setUserReview(null);
      setRating(0);
      setComment('');
      setEditingReview(false);
      
      // Refresh reviews and product data
      await fetchReviews();
      await fetchProduct();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleEditReview = () => {
    setEditingReview(true);
    setRating(userReview.rating);
    setComment(userReview.comment);
  };

  const handleCancelEdit = () => {
    setEditingReview(false);
    setRating(userReview.rating);
    setComment(userReview.comment);
  };

  const handleEdit = () => {
    console.log('Edit product:', id);
    // Navigate to edit page based on user role
    if (userRole === 'admin') {
      navigate(`/admin/products/${id}/edit`);
    } else if (userRole === 'seller') {
      navigate(`/seller/products/${id}/edit`);
    } else {
      navigate(`/buyer/products/${id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) throw new Error('Failed to delete product');

      alert('Product deleted successfully!');
      
      // Navigate back to products list based on user role
      if (userRole === 'admin') {
        navigate('/admin/products');
      } else if (userRole === 'seller') {
        navigate('/seller/products');
      } else {
        navigate('/buyer/products');
      }
    } catch (error) {
      alert('Error deleting product: ' + error.message);
    }
  };

  const handleBackClick = () => {
    // Navigate back to products list based on user role
    if (userRole === 'admin') {
      navigate('/admin/products');
    } else if (userRole === 'seller') {
      navigate('/seller/products');
    } else {
      navigate('/buyer/products');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Product not found</p>
          <button
            onClick={handleBackClick}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : (product.product_image ? [product.product_image] : []);
  
  const discountedPrice = product.discount_percentage > 0
    ? (product.price - (product.price * product.discount_percentage / 100)).toFixed(2)
    : product.price;

  const canEditDelete = userRole === 'admin' || (product.users && product.users.id === userId);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button and Actions */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
          </button>

          {/* Edit & Delete Buttons */}
          {canEditDelete && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Left: Images */}
            <div>
              {/* Main Image */}
              <div className="bg-gray-100 rounded-xl overflow-hidden mb-4 aspect-square">
                {images.length > 0 && images[selectedImage] ? (
                  <img
                    src={images[selectedImage]}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                    📦
                  </div>
                )}
              </div>

              {/* Thumbnail Images */}
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                        selectedImage === idx ? 'border-blue-500' : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.product_name}</h1>
              
              {/* Category & Brand */}
              <div className="flex gap-2 mb-4">
                {product.category && (
                  <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                    {product.category}
                  </span>
                )}
                {product.brand && (
                  <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full font-medium">
                    {product.brand}
                  </span>
                )}
                {product.is_featured && (
                  <span className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1 rounded-full font-medium">
                    ⭐ Featured
                  </span>
                )}
              </div>

              {/* Rating Display */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(product.rating_average || 0) ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {product.rating_average ? product.rating_average.toFixed(1) : '0.0'} ({product.rating_count || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="mb-6">
                {product.discount_percentage > 0 ? (
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-[#a48a6d]">₱{discountedPrice}</span>
                    <span className="text-2xl text-gray-500 line-through">₱{product.price}</span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{product.discount_percentage}% OFF
                    </span>
                  </div>
                ) : (
                  <span className="text-4xl font-bold text-gray-900">₱{product.price}</span>
                )}
              </div>

              {/* Stock & Sales Info */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Stock</p>
                  <p className={`text-2xl font-bold ${product.stock_quantity > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                    {product.stock_quantity}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Sold</p>
                  <p className="text-2xl font-bold text-blue-600">{product.sold_count || 0}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {product.description || 'No description available.'}
                </p>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Seller Info */}
              {product.users && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                      {product.users.profile_image ? (
                        <img src={product.users.profile_image} alt={product.users.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold text-lg">{product.users.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seller</p>
                      <p className="font-bold text-gray-900">{product.users.full_name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="border-t border-gray-200 p-8">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

            {/* Write/Edit Review */}
            {userId && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-8 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    {userReview && !editingReview ? 'Your Review' : editingReview ? 'Edit Your Review' : 'Write a Review'}
                  </h3>
                  {userReview && !editingReview && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditReview}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReview(userReview.id)}
                        className="text-red-600 hover:text-red-700 font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                
                {(!userReview || editingReview) && (
                  <>
                    {/* Star Rating Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Your Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="transition-transform hover:scale-125"
                          >
                            <svg
                              className={`w-8 h-8 ${
                                star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment Input */}
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Your Review</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows="4"
                        className="w-full border-2 border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Share your experience with this product... (minimum 10 characters)"
                      />
                      <p className="text-sm text-gray-500 mt-1">{comment.length} characters</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submitting}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Submitting...' : (editingReview ? 'Update Review' : 'Submit Review')}
                      </button>
                      {editingReview && (
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Display user's existing review (when not editing) */}
                {userReview && !editingReview && (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-5 h-5 ${star <= userReview.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">{formatDate(userReview.created_at)}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{userReview.comment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No reviews yet. Be the first to review!</p>
              ) : (
                reviews
                  .filter(review => review.user_id !== userId) // Don't show user's own review in the list
                  .map((review) => (
                    <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          {review.users?.profile_image ? (
                            <img src={review.users.profile_image} alt={review.users.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-white">{review.users?.full_name?.charAt(0) || '?'}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-900">{review.users?.full_name || 'Anonymous'}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                          </div>
                          <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;