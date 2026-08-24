from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StorefrontPagination(PageNumberPagination):
    """
    Adds the page metadata the storefront needs to draw a pager.

    DRF's default response omits page size and page count, which would force
    the frontend to hardcode PAGE_SIZE and drift the moment it changes here.
    """

    page_size_query_param = "page_size"
    max_page_size = 48

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page": self.page.number,
                "total_pages": self.page.paginator.num_pages,
                "page_size": self.get_page_size(self.request),
                "results": data,
            }
        )
