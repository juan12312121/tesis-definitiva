nano full_stress.py

chmod +x full_stress.py

python3 full_stress.py


import multiprocessing
import threading
import time
import math

# ========================
# CPU (constante al 100%)
# ========================
def burn_cpu():
    x = 1.000001
    while True:
        x = math.sqrt(x * x * 1.000001)

# ========================
# RAM (incremental, seguro)
# ========================
def burn_ram_limited():
    arr = []
    # t3.micro = 1 GB RAM -> usamos ~800 MB para evitar OOM
    target_mb = 800
    allocated = 0

    while allocated < target_mb:
        arr.append(bytearray(1024 * 1024))  # 1 MB
        allocated += 1
        time.sleep(0.05)  # evita que el kernel mate el proceso

    # mantener viva la RAM
    while True:
        time.sleep(1)

# ========================
# START
# ========================
if __name__ == "__main__":
    cpu_count = multiprocessing.cpu_count()
    print(f"Iniciando stress estable en {cpu_count} núcleos...")

    # CPU: 2 procesos por vCPU
    for _ in range(cpu_count * 2):
        multiprocessing.Process(target=burn_cpu).start()

    # RAM
    threading.Thread(target=burn_ram_limited).start()

    while True:
        time.sleep(1)
