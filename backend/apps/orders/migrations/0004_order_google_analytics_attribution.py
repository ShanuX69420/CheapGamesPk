from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Room for Google Analytics beside Meta.

    `purchase_event_sent_at` is renamed rather than reused: there are now two
    networks to report a sale to, each able to fail on its own, so each needs
    its own stamp or a retry would re-send the half that already landed.
    """

    dependencies = [
        ("orders", "0003_order_meta_attribution"),
    ]

    operations = [
        migrations.RenameField(
            model_name="order",
            old_name="purchase_event_sent_at",
            new_name="meta_purchase_event_sent_at",
        ),
        migrations.AddField(
            model_name="order",
            name="ga_purchase_event_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="ga_client_id",
            field=models.CharField(
                blank=True, max_length=64, verbose_name="Google client id"
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="ga_session_id",
            field=models.CharField(
                blank=True, max_length=32, verbose_name="Google session id"
            ),
        ),
    ]
